const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
let savedToken = null;
let storageFails = false;
const originalLoad = Module._load;
Module._load = function (name, parent, isMain) {
  if (name === "react-native") return { Platform: { OS: "ios" } };
  if (name === "expo-secure-store")
    return {
      getItemAsync: async () => savedToken,
      setItemAsync: async (_, token) => {
        if (storageFails) throw Error("Storage unavailable");
        savedToken = token;
      },
      deleteItemAsync: async () => {
        if (storageFails) throw Error("Storage unavailable");
        savedToken = null;
      },
    };
  if (name.startsWith("@/")) name = path.join(root, "src", name.slice(2));
  return originalLoad.call(this, name, parent, isMain);
};
require.extensions[".ts"] = function (module, filename) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(outputText, filename);
};
process.env.EXPO_PUBLIC_API_URL = "https://divvy.test/api";
const { store } = require("../src/store/index.ts");
const { authApi } = require("../src/features/auth/authApi.ts");
const { api } = require("../src/services/api.ts");
const {
  setSession,
  clearSession,
} = require("../src/features/auth/authSlice.ts");
const {
  readToken,
  writeToken,
} = require("../src/features/auth/sessionStorage.ts");
const user = {
  id: "u1",
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
  role: "USER",
};
const originalFetch = global.fetch;
function respond(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function signedIn() {
  savedToken = "saved-token";
  store.dispatch(setSession({ token: savedToken, user }));
}
afterEach(() => {
  global.fetch = originalFetch;
  storageFails = false;
  savedToken = null;
  process.env.EXPO_PUBLIC_API_URL = "https://divvy.test/api";
  store.dispatch(clearSession());
  store.dispatch(api.util.resetApiState());
});
test("login sends backend JSON contract and returns typed session data", async () => {
  global.fetch = async (request) => {
    assert.equal(request.url, "https://divvy.test/api/auth/login");
    assert.equal(request.method, "POST");
    assert.deepEqual(await request.json(), {
      email: user.email,
      password: "secret",
    });
    return respond(200, { success: true, data: { token: "new-token", user } });
  };
  const result = await store
    .dispatch(
      authApi.endpoints.login.initiate({
        email: user.email,
        password: "secret",
      }),
    )
    .unwrap();
  assert.equal(result.data.token, "new-token");
});
test("restoration request attaches saved bearer token", async () => {
  signedIn();
  global.fetch = async (request) => {
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    return respond(200, { success: true, data: { user } });
  };
  assert.deepEqual(
    (await store.dispatch(authApi.endpoints.me.initiate()).unwrap()).data.user,
    user,
  );
});
test("expired session clears saved and in-memory credentials", async () => {
  signedIn();
  global.fetch = async () => respond(401, { success: false });
  await assert.rejects(
    store.dispatch(authApi.endpoints.me.initiate()).unwrap(),
  );
  assert.equal(store.getState().auth.token, null);
  assert.equal(savedToken, null);
});
test("network failure preserves session for retry", async () => {
  signedIn();
  global.fetch = async () => {
    throw Error("Offline");
  };
  await assert.rejects(
    store.dispatch(authApi.endpoints.me.initiate()).unwrap(),
  );
  assert.equal(store.getState().auth.token, "saved-token");
  assert.equal(savedToken, "saved-token");
});
test("logout failure preserves credentials for retry", async () => {
  signedIn();
  global.fetch = async (request) => {
    assert.equal(request.method, "POST");
    assert.equal(request.url, "https://divvy.test/api/auth/logout");
    return respond(500, { success: false });
  };
  await assert.rejects(
    store.dispatch(authApi.endpoints.logout.initiate()).unwrap(),
  );
  assert.equal(store.getState().auth.token, "saved-token");
});
test("late unauthorized response cannot clear a newer session", async () => {
  signedIn();
  let release;
  global.fetch = async () =>
    new Promise((resolve) => {
      release = () => resolve(respond(401, {}));
    });
  const request = store.dispatch(authApi.endpoints.me.initiate());
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  savedToken = "new-token";
  store.dispatch(setSession({ token: savedToken, user }));
  release();
  await assert.rejects(request.unwrap());
  assert.equal(store.getState().auth.token, "new-token");
  assert.equal(savedToken, "new-token");
});
test("secure storage saves/restores token and reports write failures", async () => {
  await writeToken("persisted");
  assert.equal(await readToken(), "persisted");
  storageFails = true;
  await assert.rejects(writeToken("replacement"));
  assert.equal(await readToken(), "persisted");
});
test("missing API configuration fails locally without a network request", async () => {
  process.env.EXPO_PUBLIC_API_URL = "";
  global.fetch = async () => {
    assert.fail("Unexpected network request");
  };
  await assert.rejects(
    store
      .dispatch(
        authApi.endpoints.login.initiate({
          email: user.email,
          password: "secret",
        }),
      )
      .unwrap(),
    (error) => error.status === "CUSTOM_ERROR",
  );
});

const { expensesApi } = require("../src/features/expenses/expensesApi.ts");
const { dashboardApi } = require("../src/features/dashboard/dashboardApi.ts");

for (const operation of ["updateExpense", "deleteExpense"]) {
  test(`${operation} uses the expense endpoint and refreshes list, detail, and dashboard`, async () => {
    signedIn();
    const expense = { _id: "e1", groupId: "g1", description: "Dinner" };
    const body = {
      description: "Updated dinner",
      amount: 100,
      category: "FOOD",
      paidBy: "u1",
      splitType: "EXACT",
      participants: [{ userId: "u1", amount: 100 }],
      date: "2026-10-15T04:00:00.000Z",
      notes: "Corrected",
    };
    const counts = { list: 0, detail: 0, dashboard: 0 };
    global.fetch = async (request) => {
      assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
      if (request.method !== "GET") {
        assert.equal(request.url, "https://divvy.test/api/expenses/e1");
        assert.equal(
          request.method,
          operation === "updateExpense" ? "PUT" : "DELETE",
        );
        if (operation === "updateExpense")
          assert.deepEqual(await request.json(), body);
        else assert.equal(await request.text(), "");
        return respond(200, { success: true, code: 200, data: { expense } });
      }
      if (request.url.includes("/dashboard")) {
        counts.dashboard++;
        return respond(200, { success: true, data: {} });
      }
      if (request.url.includes("/groups/g1/expenses")) {
        counts.list++;
        return respond(200, { success: true, data: { expenses: [expense] } });
      }
      assert.equal(request.url, "https://divvy.test/api/expenses/e1");
      counts.detail++;
      return respond(200, { success: true, data: { expense } });
    };
    const queries = [
      store.dispatch(
        expensesApi.endpoints.getGroupExpenses.initiate({ groupId: "g1" }),
      ),
      store.dispatch(expensesApi.endpoints.getExpense.initiate("e1")),
      store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1")),
    ];
    try {
      await Promise.all(queries.map((query) => query.unwrap()));
      await store
        .dispatch(
          expensesApi.endpoints[operation].initiate({
            groupId: "g1",
            expenseId: "e1",
            body,
          }),
        )
        .unwrap();
      await Promise.all(
        store
          .dispatch(api.util.getRunningQueriesThunk())
          .map((query) => query.unwrap()),
      );
      assert.deepEqual(counts, { list: 2, detail: 2, dashboard: 2 });
    } finally {
      queries.forEach((query) => query.unsubscribe());
    }
  });
}

test("expense mutation errors preserve the session and cached list", async () => {
  signedIn();
  let reads = 0;
  global.fetch = async (request) => {
    if (request.method === "GET") {
      reads++;
      return respond(200, {
        success: true,
        data: { expenses: [{ _id: "e1" }] },
      });
    }
    return respond(403, {
      success: false,
      message: "You do not have access to this expense.",
    });
  };
  const query = store.dispatch(
    expensesApi.endpoints.getGroupExpenses.initiate({ groupId: "g1" }),
  );
  try {
    await query.unwrap();
    for (const operation of ["updateExpense", "deleteExpense"]) {
      await assert.rejects(
        store
          .dispatch(
            expensesApi.endpoints[operation].initiate({
              groupId: "g1",
              expenseId: "e1",
              body: {},
            }),
          )
          .unwrap(),
        (error) => error.status === 403,
      );
    }
    assert.equal(reads, 1);
    assert.equal(store.getState().auth.token, "saved-token");
    assert.equal(
      expensesApi.endpoints.getGroupExpenses.select({ groupId: "g1" })(
        store.getState(),
      ).data.data.expenses.length,
      1,
    );
  } finally {
    query.unsubscribe();
  }
});

const {
  validateExpenseFilters,
} = require("../src/features/expenses/filters.ts");

test("expense filters reject impossible and reversed dates but allow open ranges", () => {
  for (const filters of [
    {},
    { startDate: "2024-02-29" },
    { endDate: "2026-10-15" },
    { startDate: "2026-10-15", endDate: "2026-10-15" },
  ]) {
    assert.equal(validateExpenseFilters(filters), "");
  }
  for (const value of [
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "15/10/2026",
  ]) {
    assert.match(
      validateExpenseFilters({ startDate: value }),
      /valid start date/,
    );
    assert.match(validateExpenseFilters({ endDate: value }), /valid end date/);
  }
  assert.match(
    validateExpenseFilters({ startDate: "2026-10-16", endDate: "2026-10-15" }),
    /on or after/,
  );
});

test("expense search and filters reach the server and use separate caches for ranges and pages", async () => {
  signedIn();
  const requests = [];
  global.fetch = async (request) => {
    const url = new URL(request.url);
    assert.equal(url.pathname, "/api/groups/g1/expenses");
    const params = Object.fromEntries(url.searchParams);
    requests.push(params);
    return respond(200, {
      success: true,
      data: { expenses: [{ _id: JSON.stringify(params) }] },
    });
  };
  const filters = {
    groupId: "g1",
    search: "Meal + snacks",
    category: "FOOD",
    startDate: "2026-10-01",
    endDate: "2026-10-15",
  };
  const args = [
    filters,
    { ...filters, page: 2 },
    { ...filters, search: "Rent" },
    { groupId: "g1", endDate: "2026-10-15" },
    { groupId: "g1" },
  ];
  for (const value of args) {
    await store
      .dispatch(
        expensesApi.endpoints.getGroupExpenses.initiate(value, {
          subscribe: false,
        }),
      )
      .unwrap();
  }
  assert.deepEqual(requests, [
    {
      page: "1",
      limit: "10",
      search: "Meal + snacks",
      category: "FOOD",
      startDate: "2026-10-01",
      endDate: "2026-10-15",
    },
    {
      page: "2",
      limit: "10",
      search: "Meal + snacks",
      category: "FOOD",
      startDate: "2026-10-01",
      endDate: "2026-10-15",
    },
    { page: "1", limit: "10", search: "Rent", category: "FOOD", startDate: "2026-10-01", endDate: "2026-10-15" },
    { page: "1", limit: "10", endDate: "2026-10-15" },
    { page: "1", limit: "10" },
  ]);
  for (const [index, value] of args.entries()) {
    assert.equal(
      expensesApi.endpoints.getGroupExpenses.select(value)(store.getState())
        .data.data.expenses[0]._id,
      JSON.stringify(requests[index]),
    );
  }
});

const { billsApi } = require("../src/features/bills/billsApi.ts");
const { validateBillForm } = require("../src/features/bills/billForm.ts");

test("bill form validates required fields, money, and real calendar dates", () => {
  assert.equal(validateBillForm("Rent", "1200.50", "2028-02-29"), "");
  assert.match(validateBillForm(" ", "10", "2026-10-15"), /name/);
  for (const amount of ["0", "-1", "1.234", "Infinity", "1e3", ""]) {
    assert.match(validateBillForm("Rent", amount, "2026-10-15"), /amount/);
  }
  for (const date of ["2026-02-29", "2026-04-31", "15/10/2026", ""]) {
    assert.match(validateBillForm("Rent", "10", date), /due date/);
  }
});

for (const operation of ["createBill", "markBillPaid"]) {
  test(`${operation} sends the backend contract and refreshes bill lists and dashboard`, async () => {
    signedIn();
    const bill = {
      _id: "b1",
      groupId: "g1",
      name: "Electricity",
      status: "PENDING",
    };
    const body = {
      name: "Electricity",
      amount: 123.45,
      category: "ELECTRICITY",
      dueDate: "2026-10-20T00:00:00.000Z",
      notes: "Account 123",
      isRecurring: false,
    };
    const reads = { list: 0, dashboard: 0, detail: 0 };
    global.fetch = async (request) => {
      assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
      if (request.method !== "GET") {
        assert.equal(
          request.url,
          operation === "createBill"
            ? "https://divvy.test/api/groups/g1/bills"
            : "https://divvy.test/api/bills/b1/pay",
        );
        assert.equal(
          request.method,
          "POST",
        );
        assert.deepEqual(
          await request.json(),
          operation === "createBill" ? body : { paidBy: "u1", splitType: "EQUAL", participants: [{userId:"u1"}] },
        );
        return respond(operation === "createBill" ? 201 : 200, {
          success: true,
          data: { bill },
        });
      }
      if (request.url.includes("/dashboard")) {
        reads.dashboard++;
        return respond(200, { success: true, data: {} });
      }
      if (request.url.includes("/groups/g1/bills")) {
        reads.list++;
        return respond(200, { success: true, data: { bills: [bill] } });
      }
      assert.equal(request.url, "https://divvy.test/api/bills/b1");
      reads.detail++;
      return respond(200, { success: true, data: { bill } });
    };
    const queries = [
      store.dispatch(
        billsApi.endpoints.getGroupBills.initiate({ groupId: "g1" }),
      ),
      store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1")),
      store.dispatch(billsApi.endpoints.getBill.initiate("b1")),
    ];
    try {
      await Promise.all(queries.map((query) => query.unwrap()));
      await store
        .dispatch(
          billsApi.endpoints[operation].initiate({
            groupId: "g1",
            billId: "b1",
            body: operation === "createBill" ? body : {paidBy:"u1",splitType:"EQUAL",participants:[{userId:"u1"}]},
          }),
        )
        .unwrap();
      await Promise.all(
        store
          .dispatch(api.util.getRunningQueriesThunk())
          .map((query) => query.unwrap()),
      );
      assert.deepEqual(reads, {
        list: 2,
        dashboard: 2,
        detail: operation === "createBill" ? 1 : 2,
      });
    } finally {
      queries.forEach((query) => query.unsubscribe());
    }
  });
}

test("bill payment failure preserves cached bills and session for retry", async () => {
  signedIn();
  let reads = 0;
  global.fetch = async (request) => {
    if (request.method === "GET") {
      reads++;
      return respond(200, {
        success: true,
        data: { bills: [{ _id: "b1", status: "PENDING" }] },
      });
    }
    return respond(400, {
      success: false,
      message: "The payer is not an active member of this group.",
    });
  };
  const query = store.dispatch(
    billsApi.endpoints.getGroupBills.initiate({ groupId: "g1" }),
  );
  try {
    await query.unwrap();
    await assert.rejects(
      store
        .dispatch(
          billsApi.endpoints.markBillPaid.initiate({
            groupId: "g1",
            billId: "b1",
            body: {paidBy:"u2",splitType:"EQUAL",participants:[{userId:"u2"}]},
          }),
        )
        .unwrap(),
      (error) => error.status === 400,
    );
    assert.equal(reads, 1);
    assert.equal(store.getState().auth.token, "saved-token");
    assert.equal(
      billsApi.endpoints.getGroupBills.select({ groupId: "g1" })(
        store.getState(),
      ).data.data.bills[0].status,
      "PENDING",
    );
  } finally {
    query.unsubscribe();
  }
});

for (const operation of ["updateBill", "deleteBill"]) {
  test(`${operation} uses the bill endpoint and refreshes list, detail and dashboard`, async () => {
    signedIn();
    const bill = { _id: "b1", groupId: "g1", name: "Rent", status: "PENDING" };
    const body = {
      name: "Updated rent",
      amount: 1250,
      category: "RENT",
      dueDate: "2026-10-20T00:00:00.000Z",
      notes: "Corrected",
      isRecurring: false,
      recurrence: null,
    };
    const reads = { list: 0, detail: 0, dashboard: 0 };
    global.fetch = async (request) => {
      assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
      if (request.method !== "GET") {
        assert.equal(request.url, "https://divvy.test/api/bills/b1");
        assert.equal(
          request.method,
          operation === "updateBill" ? "PUT" : "DELETE",
        );
        if (operation === "updateBill")
          assert.deepEqual(await request.json(), body);
        else assert.equal(await request.text(), "");
        return respond(200, { success: true, data: { bill } });
      }
      if (request.url.includes("/dashboard")) {
        reads.dashboard++;
        return respond(200, { success: true, data: {} });
      }
      if (request.url.includes("/groups/g1/bills")) {
        reads.list++;
        return respond(200, { success: true, data: { bills: [bill] } });
      }
      reads.detail++;
      return respond(200, { success: true, data: { bill } });
    };
    const queries = [
      store.dispatch(
        billsApi.endpoints.getGroupBills.initiate({ groupId: "g1" }),
      ),
      store.dispatch(billsApi.endpoints.getBill.initiate("b1")),
      store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1")),
    ];
    try {
      await Promise.all(queries.map((query) => query.unwrap()));
      await store
        .dispatch(
          billsApi.endpoints[operation].initiate({
            groupId: "g1",
            billId: "b1",
            body,
          }),
        )
        .unwrap();
      await Promise.all(
        store
          .dispatch(api.util.getRunningQueriesThunk())
          .map((query) => query.unwrap()),
      );
      assert.deepEqual(reads, { list: 2, detail: 2, dashboard: 2 });
    } finally {
      queries.forEach((query) => query.unsubscribe());
    }
  });
  test(`${operation} refreshes locked bill state after a concurrent payment`, async () => {
    signedIn();
    let reads = 0;
    global.fetch = async (request) => {
      if (request.method === "GET") {
        reads++;
        return respond(200, {
          success: true,
          data: {
            bill: { _id: "b1", status: reads === 1 ? "PENDING" : "PAID" },
          },
        });
      }
      return respond(409, {
        success: false,
        message: "Paid bills cannot be edited or deleted.",
      });
    };
    const query = store.dispatch(billsApi.endpoints.getBill.initiate("b1"));
    try {
      await query.unwrap();
      await assert.rejects(
        store
          .dispatch(
            billsApi.endpoints[operation].initiate({
              groupId: "g1",
              billId: "b1",
              body: {},
            }),
          )
          .unwrap(),
        (error) => error.status === 409,
      );
      await Promise.all(
        store
          .dispatch(api.util.getRunningQueriesThunk())
          .map((query) => query.unwrap()),
      );
      assert.equal(reads, 2);
      assert.equal(
        billsApi.endpoints.getBill.select("b1")(store.getState()).data.data.bill
          .status,
        "PAID",
      );
    } finally {
      query.unsubscribe();
    }
  });
}

const { groupsApi } = require("../src/features/groups/groupsApi.ts");

test("adding a member normalizes the email and refreshes membership and dashboard caches", async () => {
  signedIn();
  let added = false;
  const reads = { members: 0, groups: 0, dashboard: 0 };
  global.fetch = async (request) => {
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    if (request.method === "POST") {
      assert.equal(request.url, "https://divvy.test/api/groups/g1/members");
      assert.deepEqual(await request.json(), { email: "new@example.com" });
      added = true;
      return respond(201, {
        success: true,
        data: {
          member: {
            id: "u2",
            firstName: "New",
            lastName: "Member",
            email: "new@example.com",
            role: "MEMBER",
          },
        },
      });
    }
    if (request.url.endsWith("/members")) {
      reads.members++;
      return respond(200, {
        success: true,
        data: {
          members: added
            ? [{ _id: "m2", userId: { _id: "u2" }, status: "ACTIVE" }]
            : [],
        },
      });
    }
    if (request.url.endsWith("/dashboard")) {
      reads.dashboard++;
      return respond(200, { success: true, data: {} });
    }
    reads.groups++;
    return respond(200, { success: true, data: { groups: [] } });
  };
  const queries = [
    store.dispatch(groupsApi.endpoints.getGroupMembers.initiate("g1")),
    store.dispatch(groupsApi.endpoints.getMyGroups.initiate()),
    store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1")),
  ];
  try {
    await Promise.all(queries.map((query) => query.unwrap()));
    await store
      .dispatch(
        groupsApi.endpoints.addGroupMember.initiate({
          groupId: "g1",
          email: " New@Example.COM ",
        }),
      )
      .unwrap();
    await Promise.all(
      store
        .dispatch(api.util.getRunningQueriesThunk())
        .map((query) => query.unwrap()),
    );
    assert.deepEqual(reads, { members: 2, groups: 2, dashboard: 2 });
    assert.equal(
      groupsApi.endpoints.getGroupMembers.select("g1")(store.getState()).data
        .data.members[0].userId._id,
      "u2",
    );
  } finally {
    queries.forEach((query) => query.unsubscribe());
  }
});

for (const status of [403, 404, 409]) {
  test(`add member surfaces ${status} without changing the member list`, async () => {
    signedIn();
    let reads = 0;
    global.fetch = async (request) => {
      if (request.method === "GET") {
        reads++;
        return respond(200, { success: true, data: { members: [] } });
      }
      return respond(status, {
        success: false,
        message: "Cannot add this member.",
      });
    };
    const query = store.dispatch(
      groupsApi.endpoints.getGroupMembers.initiate("g1"),
    );
    try {
      await query.unwrap();
      await assert.rejects(
        store
          .dispatch(
            groupsApi.endpoints.addGroupMember.initiate({
              groupId: "g1",
              email: "new@example.com",
            }),
          )
          .unwrap(),
        (error) =>
          error.status === status &&
          error.data.message === "Cannot add this member.",
      );
      assert.equal(reads, 1);
      assert.deepEqual(
        groupsApi.endpoints.getGroupMembers.select("g1")(store.getState()).data
          .data.members,
        [],
      );
    } finally {
      query.unsubscribe();
    }
  });
}

for (const operation of ["renameGroup", "removeGroupMember"]) {
  test(`${operation} sends the verified contract and refreshes group data`, async () => {
    signedIn();
    let changed = false;
    const reads = { groups: 0, members: 0, dashboard: 0 };
    global.fetch = async (request) => {
      assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
      if (request.method !== "GET") {
        assert.equal(
          request.url,
          operation === "renameGroup"
            ? "https://divvy.test/api/groups/g1"
            : "https://divvy.test/api/groups/g1/members/u2",
        );
        assert.equal(
          request.method,
          operation === "renameGroup" ? "PUT" : "DELETE",
        );
        if (operation === "renameGroup")
          assert.deepEqual(await request.json(), { name: "Our home" });
        else assert.equal(await request.text(), "");
        changed = true;
        return respond(200, {
          success: true,
          message: "Updated",
          data: { group: { _id: "g1", name: "Our home" } },
        });
      }
      if (request.url.endsWith("/members")) {
        reads.members++;
        return respond(200, {
          success: true,
          data: {
            members:
              changed && operation === "removeGroupMember"
                ? []
                : [{ userId: { _id: "u2" } }],
          },
        });
      }
      if (request.url.endsWith("/dashboard")) {
        reads.dashboard++;
        return respond(200, { success: true, data: {} });
      }
      reads.groups++;
      return respond(200, {
        success: true,
        data: { groups: [{ id: "g1", name: changed ? "Our home" : "Home" }] },
      });
    };
    const queries = [
      store.dispatch(groupsApi.endpoints.getMyGroups.initiate()),
      store.dispatch(groupsApi.endpoints.getGroupMembers.initiate("g1")),
      store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1")),
    ];
    try {
      await Promise.all(queries.map((query) => query.unwrap()));
      await store
        .dispatch(
          groupsApi.endpoints[operation].initiate({
            groupId: "g1",
            userId: "u2",
            name: " Our home ",
          }),
        )
        .unwrap();
      await Promise.all(
        store
          .dispatch(api.util.getRunningQueriesThunk())
          .map((query) => query.unwrap()),
      );
      assert.deepEqual(reads, {
        groups: 2,
        members: 2,
        dashboard: operation === "removeGroupMember" ? 2 : 1,
      });
      if (operation === "renameGroup")
        assert.equal(
          groupsApi.endpoints.getMyGroups.select()(store.getState()).data.data
            .groups[0].name,
          "Our home",
        );
      else
        assert.deepEqual(
          groupsApi.endpoints.getGroupMembers.select("g1")(store.getState())
            .data.data.members,
          [],
        );
    } finally {
      queries.forEach((query) => query.unsubscribe());
    }
  });
  test(`${operation} preserves cached group data when access is denied`, async () => {
    signedIn();
    let reads = 0;
    global.fetch = async (request) => {
      if (request.method === "GET") {
        reads++;
        return respond(200, {
          success: true,
          data: { groups: [{ id: "g1", name: "Home" }] },
        });
      }
      return respond(403, {
        success: false,
        message: "Only the group owner can perform this action.",
      });
    };
    const query = store.dispatch(groupsApi.endpoints.getMyGroups.initiate());
    try {
      await query.unwrap();
      await assert.rejects(
        store
          .dispatch(
            groupsApi.endpoints[operation].initiate({
              groupId: "g1",
              userId: "u2",
              name: "Changed",
            }),
          )
          .unwrap(),
        (error) => error.status === 403,
      );
      assert.equal(reads, 1);
      assert.equal(
        groupsApi.endpoints.getMyGroups.select()(store.getState()).data.data
          .groups[0].name,
        "Home",
      );
    } finally {
      query.unsubscribe();
    }
  });
}

const {
  settlementsApi,
} = require("../src/features/settlements/settlementsApi.ts");
const {
  validatePayment,
  localCalendarDate,
} = require("../src/features/settlements/paymentForm.ts");

test("repayment validation rejects invalid money and future/impossible dates", () => {
  const now = new Date(2026, 9, 16, 12);
  assert.equal(validatePayment("100.25", "2026-10-16", now), "");
  assert.equal(validatePayment("0.01", "2024-02-29", now), "");
  assert.equal(localCalendarDate(now), "2026-10-16");
  for (const value of [
    "0",
    "-1",
    "1.001",
    "Infinity",
    "1e3",
    "",
    "9007199254740992",
  ])
    assert.match(validatePayment(value, "2026-10-16", now), /positive amount/);
  for (const value of [
    "2026-10-17",
    "2026-02-29",
    "2026-04-31",
    "16/10/2026",
    "",
  ])
    assert.match(validatePayment("100", value, now), /valid payment date/);
});

test("record repayment sends only recipient, amount, date and refreshes balances, suggestions, history", async () => {
  signedIn();
  const reads = { suggestions: 0, history: 0, dashboard: 0 };
  const body = { to: "u2", amount: 125.5, paidAt: "2026-10-15T16:00:00.000Z" };
  global.fetch = async (request) => {
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    if (request.method === "POST") {
      assert.equal(request.url, "https://divvy.test/api/groups/g1/settlements");
      assert.deepEqual(await request.json(), body);
      return respond(201, {
        success: true,
        data: { settlement: { _id: "s1", ...body, from: "u1" } },
      });
    }
    if (request.url.includes("/history")) {
      reads.history++;
      return respond(200, {
        success: true,
        data: { settlements: [] },
        pagination: { page: 1, totalPages: 0 },
      });
    }
    if (request.url.endsWith("/dashboard")) {
      reads.dashboard++;
      return respond(200, { success: true, data: {} });
    }
    reads.suggestions++;
    return respond(200, { success: true, data: { settlements: [] } });
  };
  const queries = [
    store.dispatch(
      settlementsApi.endpoints.getSettlementSuggestions.initiate("g1"),
    ),
    store.dispatch(
      settlementsApi.endpoints.getSettlementHistory.initiate({ groupId: "g1" }),
    ),
    store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1")),
  ];
  try {
    await Promise.all(queries.map((query) => query.unwrap()));
    await store
      .dispatch(
        settlementsApi.endpoints.recordSettlement.initiate({
          groupId: "g1",
          body,
        }),
      )
      .unwrap();
    await Promise.all(
      store
        .dispatch(api.util.getRunningQueriesThunk())
        .map((query) => query.unwrap()),
    );
    assert.deepEqual(reads, { suggestions: 2, history: 2, dashboard: 2 });
  } finally {
    queries.forEach((query) => query.unsubscribe());
  }
});

test("repayment history uses backend pagination and separate page caches", async () => {
  signedIn();
  global.fetch = async (request) => {
    const url = new URL(request.url);
    assert.equal(url.pathname, "/api/groups/g1/settlements/history");
    assert.equal(url.searchParams.get("limit"), "10");
    const page = Number(url.searchParams.get("page"));
    return respond(200, {
      success: true,
      data: { settlements: [{ _id: `p${page}` }] },
      pagination: { page, totalPages: 2 },
    });
  };
  for (const page of [1, 2])
    await store
      .dispatch(
        settlementsApi.endpoints.getSettlementHistory.initiate(
          { groupId: "g1", page },
          { subscribe: false },
        ),
      )
      .unwrap();
  for (const page of [1, 2])
    assert.equal(
      settlementsApi.endpoints.getSettlementHistory.select({
        groupId: "g1",
        page,
      })(store.getState()).data.data.settlements[0]._id,
      `p${page}`,
    );
});

for (const status of [400, 403, 500]) {
  test(`repayment ${status} preserves saved history without optimistic balance changes`, async () => {
    signedIn();
    let reads = 0;
    global.fetch = async (request) => {
      if (request.method === "GET") {
        reads++;
        return respond(200, {
          success: true,
          data: { settlements: [] },
          pagination: { page: 1, totalPages: 0 },
        });
      }
      return respond(status, {
        success: false,
        message: "Payment could not be saved.",
      });
    };
    const query = store.dispatch(
      settlementsApi.endpoints.getSettlementHistory.initiate({ groupId: "g1" }),
    );
    try {
      await query.unwrap();
      await assert.rejects(
        store
          .dispatch(
            settlementsApi.endpoints.recordSettlement.initiate({
              groupId: "g1",
              body: { to: "u2", amount: 10, paidAt: "2026-10-15T00:00:00Z" },
            }),
          )
          .unwrap(),
        (error) => error.status === status,
      );
      assert.equal(reads, 1);
      assert.deepEqual(
        settlementsApi.endpoints.getSettlementHistory.select({ groupId: "g1" })(
          store.getState(),
        ).data.data.settlements,
        [],
      );
    } finally {
      query.unsubscribe();
    }
  });
}

test("settled payment conflicts refresh history and suggestions", async () => {
  signedIn();
  let reads = 0;
  global.fetch = async (request) => {
    if (request.method === "GET") {
      reads++;
      return respond(200, { success: true, data: { settlements: [] } });
    }
    return respond(409, {
      success: false,
      message: "This repayment is already settled.",
    });
  };
  const queries = [
    store.dispatch(
      settlementsApi.endpoints.getSettlementSuggestions.initiate("g1"),
    ),
    store.dispatch(
      settlementsApi.endpoints.getSettlementHistory.initiate({ groupId: "g1" }),
    ),
  ];
  try {
    await Promise.all(queries.map((query) => query.unwrap()));
    await assert.rejects(
      store
        .dispatch(
          settlementsApi.endpoints.recordSettlement.initiate({
            groupId: "g1",
            body: {
              requestId: "payment_request_2",
              to: "u2",
              amount: 10,
              paidAt: "2026-10-15T00:00:00Z",
            },
          }),
        )
        .unwrap(),
      (error) => error.status === 409,
    );
    await Promise.all(
      store
        .dispatch(api.util.getRunningQueriesThunk())
        .map((query) => query.unwrap()),
    );
    assert.equal(reads, 4);
  } finally {
    queries.forEach((query) => query.unsubscribe());
  }
});

const { receiptsApi } = require("../src/features/receipts/receiptsApi.ts");
const { receiptDraft } = require("../src/features/receipts/receiptDraft.ts");
const extractedReceipt = {
  isReceipt: true,
  merchant: "  Corner store  ",
  date: "2026-10-15",
  currency: "PHP",
  subtotal: 90,
  tax: 10,
  tip: null,
  total: 100,
  items: [{ description: " Milk ", quantity: 1, unitPrice: 100, total: 100 }],
  warnings: ["Check extracted values"],
};

test("receipt draft uses extracted total without inventing missing amounts or dates", () => {
  assert.deepEqual(receiptDraft(extractedReceipt), {
    description: "Corner store",
    amount: "100.00",
    date: "2026-10-15",
    notes: "Milk",
  });
  for (const total of [null, 0, -1, NaN])
    assert.equal(receiptDraft({ ...extractedReceipt, total }).amount, "");
  for (const date of [null, "2026-02-29", "bad-date"])
    assert.equal(receiptDraft({ ...extractedReceipt, date }).date, "");
  assert.equal(
    receiptDraft({
      ...extractedReceipt,
      merchant: null,
      total: null,
      date: null,
    }).description,
    "",
  );
});

test("receipt scanning sends exactly one multipart file and never creates an expense", async () => {
  signedIn();
  let requests = 0;
  const body = new FormData();
  body.append(
    "receipt",
    new Blob([new Uint8Array([255, 216, 255])], { type: "image/jpeg" }),
    "receipt.jpg",
  );
  global.fetch = async (request) => {
    requests++;
    assert.equal(request.url, "https://divvy.test/api/groups/g1/receipts/scan");
    assert.equal(request.method, "POST");
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    assert.match(
      request.headers.get("Content-Type"),
      /^multipart\/form-data; boundary=/,
    );
    const form = await request.formData();
    assert.deepEqual([...form.keys()], ["receipt"]);
    const file = form.get("receipt");
    assert.equal(file.name, "receipt.jpg");
    assert.equal(file.type, "image/jpeg");
    return respond(200, {
      success: true,
      data: { groupId: "g1", requiresReview: true, receipt: extractedReceipt },
    });
  };
  const result = await store
    .dispatch(
      receiptsApi.endpoints.scanReceipt.initiate({ groupId: "g1", body }),
    )
    .unwrap();
  assert.equal(result.data.requiresReview, true);
  assert.equal(result.data.receipt.total, 100);
  assert.equal(requests, 1);
});

for (const status of [413, 415, 422, 429, 504]) {
  test(`receipt scan ${status} preserves session and exposes the backend error`, async () => {
    signedIn();
    global.fetch = async () =>
      respond(status, {
        success: false,
        message: "Receipt scan could not finish.",
      });
    await assert.rejects(
      store
        .dispatch(
          receiptsApi.endpoints.scanReceipt.initiate({
            groupId: "g1",
            body: new FormData(),
          }),
        )
        .unwrap(),
      (error) =>
        error.status === status &&
        error.data.message === "Receipt scan could not finish.",
    );
    assert.equal(store.getState().auth.token, "saved-token");
  });
}

test("native receipt upload is readable by the actual SDK 57 multipart encoder", async () => {
  const previousLoad = Module._load;
  const OriginalFormData = global.FormData;
  const bytes = new Uint8Array([255, 216, 255]);
  class NativeFile {
    constructor(uri) {
      this.uri = uri;
      this.exists = true;
      this.size = bytes.length;
      this.type = "image/jpeg";
      this.name = "receipt.jpg";
    }
    async bytes() {
      return bytes;
    }
  }
  class NativeFormData {
    constructor() {
      this.parts = [];
    }
    append(name, value) {
      this.parts.push([name, value]);
    }
    entries() {
      return this.parts.values();
    }
  }
  Module._load = function (name, parent, isMain) {
    if (name === "expo-file-system") return { File: NativeFile };
    return previousLoad.call(this, name, parent, isMain);
  };
  try {
    const {
      receiptUpload,
    } = require("../src/features/receipts/receiptUpload.ts");
    global.FormData = NativeFormData;
    const {
      convertFormDataAsync,
    } = require("../node_modules/expo/src/winter/fetch/convertFormData.ts");
    const form = await receiptUpload("file:///receipt.jpg");
    const encoded = await convertFormDataAsync(form, "test-boundary");
    const text = new TextDecoder().decode(encoded.body);
    assert.match(text, /name="receipt"; filename="receipt.jpg"/);
    assert.match(text, /content-type: image\/jpeg/);
    assert.equal(form.parts[0][1] instanceof NativeFile, true);
    assert.ok(
      encoded.body.some(
        (value, index) => value === 255 && encoded.body[index + 1] === 216,
      ),
    );
    const oldForm = new NativeFormData();
    oldForm.append("receipt", {
      uri: "file:///receipt.jpg",
      name: "receipt.jpg",
      type: "image/jpeg",
    });
    await assert.rejects(
      convertFormDataAsync(oldForm, "old-boundary"),
      /Unsupported FormDataPart implementation/,
    );
  } finally {
    Module._load = previousLoad;
    global.FormData = OriginalFormData;
  }
});

test("receipt errors distinguish upload failure from OCR timeout", () => {
  const { receiptError } = require("../src/features/receipts/receiptError.ts");
  assert.match(
    receiptError({ status: "FETCH_ERROR" }),
    /could not be uploaded/,
  );
  assert.match(receiptError({ status: "TIMEOUT_ERROR" }), /timed out/);
  assert.equal(
    receiptError({ status: 422, data: { message: "Not a receipt" } }),
    "Not a receipt",
  );
});

test("bill search and filters combine, preserve false and use distinct page/search caches", async () => {
  signedIn();
  const requests = [];
  global.fetch = async (request) => {
    const url = new URL(request.url);
    assert.equal(url.pathname, "/api/groups/g1/bills");
    const params = Object.fromEntries(url.searchParams);
    requests.push(params);
    return respond(200, { success: true, data: { bills: [{ _id: JSON.stringify(params) }] } });
  };
  const filters = { groupId: "g1", search: "Internet + phone", category: "INTERNET", status: "PENDING", isRecurring: false };
  const args = [filters, { ...filters, page: 2 }, { ...filters, search: "Wifi", isRecurring: true }, { groupId: "g1" }];
  for (const arg of args) await store.dispatch(billsApi.endpoints.getGroupBills.initiate(arg, { subscribe: false })).unwrap();
  assert.deepEqual(requests, [
    { view: "upcoming", page: "1", limit: "10", search: "Internet + phone", category: "INTERNET", status: "PENDING", isRecurring: "false" },
    { view: "upcoming", page: "2", limit: "10", search: "Internet + phone", category: "INTERNET", status: "PENDING", isRecurring: "false" },
    { view: "upcoming", page: "1", limit: "10", search: "Wifi", category: "INTERNET", status: "PENDING", isRecurring: "true" },
    { view: "upcoming", page: "1", limit: "10" },
  ]);
  for (const [index, arg] of args.entries()) assert.equal(billsApi.endpoints.getGroupBills.select(arg)(store.getState()).data.data.bills[0]._id, JSON.stringify(requests[index]));
});

test("Bills Fast Refresh replaces an older status-only endpoint", async () => {
  signedIn();
  api.injectEndpoints({ overrideExisting: true, endpoints: (builder) => ({
    getGroupBills: builder.query({ query: ({ groupId, status }) => ({ url: `/groups/${groupId}/bills`, params: { status } }) }),
  }) });
  const previousDev = global.__DEV__;
  const filename = require.resolve("../src/features/bills/billsApi.ts");
  try {
    global.__DEV__ = true;
    delete require.cache[filename];
    const refreshed = require(filename).billsApi;
    global.fetch = async (request) => {
      const url = new URL(request.url);
      assert.equal(url.searchParams.get("category"), "WATER");
      return respond(200, { success: true, data: { bills: [] } });
    };
    await store.dispatch(refreshed.endpoints.getGroupBills.initiate({ groupId: "g1", category: "WATER" }, { subscribe: false, forceRefetch: true })).unwrap();
  } finally {
    if (previousDev === undefined) delete global.__DEV__;
    else global.__DEV__ = previousDev;
  }
});

test("paying a reminder bill refreshes dashboard reminder counts and previews", async () => {
  signedIn();
  let paid = false;
  let reads = 0;
  global.fetch = async (request) => {
    const url = new URL(request.url);
    if (request.method === "POST") {
      assert.equal(url.pathname, "/api/bills/b1/pay");
      assert.deepEqual(await request.json(), {paidBy:"u1",splitType:"EQUAL",participants:[{userId:"u1"}]});
      paid = true;
      return respond(200, { success: true, data: { bill: { _id: "b1", status: "PAID" } } });
    }
    assert.equal(url.pathname, "/api/groups/g1/dashboard");
    reads++;
    const empty = { count: 0, amount: 0, bills: [] };
    return respond(200, { success: true, data: { billReminders: {
      asOf: "2026-10-16T12:00:00.000Z", timeZone: "UTC", windowDays: 7,
      overdue: paid ? empty : { count: 1, amount: 100, bills: [{ _id: "b1", name: "Rent", amount: 100, dueDate: "2026-10-15", status: "OVERDUE" }] },
      dueToday: empty, dueSoon: empty,
    } } });
  };
  const query = store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate("g1"));
  try {
    assert.equal((await query.unwrap()).data.billReminders.overdue.count, 1);
    await store.dispatch(billsApi.endpoints.markBillPaid.initiate({ groupId: "g1", billId: "b1", body:{paidBy:"u1",splitType:"EQUAL",participants:[{userId:"u1"}]} })).unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(item => item.unwrap()));
    const result = dashboardApi.endpoints.getGroupDashboard.select("g1")(store.getState());
    assert.equal(reads, 2);
    assert.deepEqual(result.data.data.billReminders.overdue, { count: 0, amount: 0, bills: [] });
  } finally { query.unsubscribe(); }
});

test("dashboard periods use separate group caches and expense changes refresh every group period", async () => {
  signedIn();
  const reads = new Map();
  global.fetch = async (request) => {
    const url = new URL(request.url);
    if (request.method === "POST") {
      assert.equal(url.pathname, "/api/groups/g1/expenses");
      return respond(201, { success: true, data: { expense: { _id: "new" } } });
    }
    assert.match(url.pathname, /^\/api\/groups\/(g1|g2)\/dashboard$/);
    const period = url.searchParams.get("period");
    assert.ok(["all_time", "this_month", "last_month"].includes(period));
    const key = `${url.pathname}:${period}`;
    reads.set(key, (reads.get(key) ?? 0) + 1);
    const total = { all_time: 100, this_month: 30, last_month: 70 }[period];
    return respond(200, { success: true, data: { period: { value: period, timeZone: "UTC", startDate: null, endDate: null }, summary: { totalExpenses: total }, spendingByCategory: [{ category: "FOOD", amount: total, count: 1, percentage: 100 }] } });
  };
  const args = [
    { groupId: "g1", period: "all_time" },
    { groupId: "g1", period: "this_month" },
    { groupId: "g1", period: "last_month" },
    { groupId: "g2", period: "this_month" },
  ];
  const queries = args.map(arg => store.dispatch(dashboardApi.endpoints.getGroupDashboard.initiate(arg)));
  try {
    const results = await Promise.all(queries.map(query => query.unwrap()));
    assert.deepEqual(results.map(result => result.data.summary.totalExpenses), [100, 30, 70, 30]);
    assert.deepEqual(results.map(result => result.data.spendingByCategory[0].amount), [100, 30, 70, 30]);
    await store.dispatch(expensesApi.endpoints.createExpense.initiate({ groupId: "g1", body: { description: "Meal", amount: 10 } })).unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query => query.unwrap()));
    for (const arg of args) {
      const key = `/api/groups/${arg.groupId}/dashboard:${arg.period}`;
      assert.equal(reads.get(key), arg.groupId === "g1" ? 2 : 1);
      assert.equal(dashboardApi.endpoints.getGroupDashboard.select(arg)(store.getState()).data.data.period.value, arg.period);
    }
  } finally { queries.forEach(query => query.unsubscribe()); }
});

test("category shortcuts validate and preserve dashboard period bounds, including all time", () => {
  const { expenseFiltersFromParams } = require("../src/features/expenses/filters.ts");
  assert.deepEqual(expenseFiltersFromParams({ category: "GROCERIES", startDate: "2026-10-01", endDate: "2026-10-31" }), {
    category: "GROCERIES", startDate: "2026-10-01", endDate: "2026-10-31",
  });
  assert.deepEqual(expenseFiltersFromParams({ category: "RENT", startDate: "", endDate: "" }), {
    category: "RENT", startDate: undefined, endDate: undefined,
  });
  for (const params of [
    { category: "UNKNOWN" },
    { category: ["FOOD", "RENT"] },
    { category: "FOOD", startDate: ["2026-10-01"] },
    { category: "FOOD", startDate: "2026-02-30" },
    { category: "FOOD", startDate: "2026-10-31", endDate: "2026-10-01" },
  ]) assert.deepEqual(expenseFiltersFromParams(params), {});
});

test("spending comparison labels handle direction, zero baselines, in-progress months and missing data", () => {
  const { spendingComparisonText } = require("../src/features/dashboard/spendingComparison.ts");
  const base = {
    current: { isInProgress: true }, previous: { startDate: "2026-09-01", amount: 2500 },
    difference: -500, percentageChange: -20, direction: "decrease",
  };
  let text = spendingComparisonText(base, "PHP");
  assert.equal(text.headline, "PHP 500.00 less than September 2026");
  assert.match(text.detail, /2,500.00.*20% decrease/);
  assert.match(text.context, /still in progress/);
  text = spendingComparisonText({ ...base, difference: 500, percentageChange: 20, direction: "increase", current: { isInProgress: false } }, "PHP");
  assert.match(text.headline, /500.00 more/); assert.match(text.detail, /20% increase/);
  assert.doesNotMatch(text.context, /in progress/);
  text = spendingComparisonText({ ...base, difference: 0, percentageChange: 0, direction: "unchanged" });
  assert.equal(text.headline, "No change from September 2026");
  assert.match(text.detail, /0% change/);
  text = spendingComparisonText({ ...base, previous: { ...base.previous, amount: 0 }, percentageChange: null });
  assert.doesNotMatch(text.detail, /NaN|Infinity|%/);
  assert.match(text.detail, /No prior spending/);
  assert.equal(spendingComparisonText(null), null);
  assert.equal(spendingComparisonText(undefined), null);
});

test("expense detail fetch preserves split shares and missing member references", async () => {
  signedIn();
  const expense = {
    _id: "e1", groupId: "g1", description: "Dinner", amount: 60, category: "FOOD", date: "2026-10-16T00:00:00.000Z", notes: "Shared dinner",
    paidBy: null, splitType: "PERCENTAGE",
    participants: [{ userId: { _id: "u1", firstName: "Test", lastName: "User" }, amount: 30, percentage: 50 }, { userId: null, amount: 30, percentage: 50 }],
  };
  global.fetch = async request => {
    assert.equal(request.url, "https://divvy.test/api/expenses/e1");
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    return respond(200, { success: true, data: { expense } });
  };
  const result = await store.dispatch(expensesApi.endpoints.getExpense.initiate("e1", { subscribe: false })).unwrap();
  assert.deepEqual(result.data.expense, expense);
});

for (const status of [403, 404, 500]) {
  test(`expense detail ${status} surfaces a retryable error without clearing the session`, async () => {
    signedIn();
    global.fetch = async () => respond(status, { success: false, message: "Expense unavailable" });
    await assert.rejects(store.dispatch(expensesApi.endpoints.getExpense.initiate("missing", { subscribe: false })).unwrap(), error => error.status === status);
    assert.equal(store.getState().auth.token, "saved-token");
    assert.equal(expensesApi.endpoints.getExpense.select("missing")(store.getState()).data, undefined);
  });
}

for (const [name, endpoint, values, filters] of [
  ["expenses", expensesApi.endpoints.getGroupExpenses, ["newest", "oldest", "amount_high", "amount_low"], { search: "Meal", category: "FOOD", startDate: "2026-10-01", endDate: "2026-10-31" }],
  ["bills", billsApi.endpoints.getGroupBills, ["due_soonest", "due_latest", "amount_high", "amount_low"], { search: "Rent", category: "RENT", status: "PENDING", isRecurring: false }],
]) {
  test(`${name} sorting reaches the server with filters and separates sort/page caches`, async () => {
    signedIn();
    let reads = 0;
    global.fetch = async request => {
      reads++;
      const url = new URL(request.url);
      assert.equal(url.pathname, `/api/groups/g1/${name}`);
      for (const [key, value] of Object.entries(filters)) assert.equal(url.searchParams.get(key), String(value));
      return respond(200, { success: true, data: { [name]: [{ _id: `${url.searchParams.get("sort")}:${url.searchParams.get("page")}` }] } });
    };
    for (const sort of values) {
      for (const page of [1, 2]) {
        const args = { groupId: "g1", ...filters, sort, page };
        const result = await store.dispatch(endpoint.initiate(args, { subscribe: false })).unwrap();
        assert.equal(result.data[name][0]._id, `${sort}:${page}`);
        assert.equal(endpoint.select(args)(store.getState()).data.data[name][0]._id, `${sort}:${page}`);
      }
    }
    assert.equal(reads, 8);
    const cached = await store.dispatch(endpoint.initiate({ groupId: "g1", ...filters, sort: values[0], page: 1 }, { subscribe: false })).unwrap();
    assert.equal(cached.data[name][0]._id, `${values[0]}:1`);
    assert.equal(reads, 8);
  });
}

test("bill field validation identifies each invalid field and rejects unsafe amounts", () => {
  const { validateBillFields } = require("../src/features/bills/billForm.ts");
  assert.deepEqual(validateBillFields(" ", "0", "2026-02-30"), {
    name: "Enter a bill name.",
    amount: "Enter an amount greater than zero, with up to 2 decimal places.",
    dueDate: "Enter a valid due date in YYYY-MM-DD format.",
  });
  assert.ok(validateBillFields("Rent", "9007199254740991", "2026-10-16").amount);
  assert.deepEqual(validateBillFields("Rent", "12.50", "2028-02-29"), {});
});


test("group creation and settings submit the selected icon", async () => {
  signedIn();
  const requests = [];
  global.fetch = async request => {
    if (request.method === "GET") return respond(200, { success: true, data: { groups: [] } });
    const body = await request.json();
    requests.push({ method: request.method, body });
    return respond(request.method === "POST" ? 201 : 200, { success: true, data: { group: { _id: "g1", ...body } } });
  };
  await store.dispatch(groupsApi.endpoints.createGroup.initiate({ name: "Trip", currency: "JPY", icon: "airplane" })).unwrap();
  await store.dispatch(groupsApi.endpoints.renameGroup.initiate({ groupId: "g1", name: " Our trip ", icon: "car" })).unwrap();
  assert.deepEqual(requests, [
    { method: "POST", body: { name: "Trip", currency: "JPY", icon: "airplane" } },
    { method: "PUT", body: { name: "Our trip", icon: "car" } },
  ]);
});


test("group settings load server currency eligibility and submit the selected currency", async () => {
  signedIn();
  let currency = "PHP";
  let locked = false;
  const writes = [];
  global.fetch = async request => {
    if (request.method === "PUT") {
      const body = await request.json(); writes.push(body);
      if (locked) return respond(409, { success: false, message: "Currency cannot change after expenses, bills or payments have been recorded." });
      currency = body.currency;
      return respond(200, { success: true, data: { group: { _id: "gCurrency", currency } } });
    }
    return respond(200, { success: true, data: { group: { id: "gCurrency", name: "Home", currency, canChangeCurrency: !locked } } });
  };
  const query = store.dispatch(groupsApi.endpoints.getGroupDetails.initiate("gCurrency"));
  try {
    assert.equal((await query.unwrap()).data.group.canChangeCurrency, true);
    await store.dispatch(groupsApi.endpoints.renameGroup.initiate({ groupId: "gCurrency", name: "Home", currency: "JPY" })).unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query => query.unwrap()));
    assert.equal(groupsApi.endpoints.getGroupDetails.select("gCurrency")(store.getState()).data.data.group.currency, "JPY");
    locked = true;
    await assert.rejects(store.dispatch(groupsApi.endpoints.renameGroup.initiate({ groupId: "gCurrency", name: "Home", currency: "KWD" })).unwrap(), error => error.status === 409);
    assert.equal(currency, "JPY");
    assert.equal((await query.refetch().unwrap()).data.group.canChangeCurrency, false);
    assert.deepEqual(writes, [{ name: "Home", currency: "JPY" }, { name: "Home", currency: "KWD" }]);
  } finally { query.unsubscribe(); }
});

test("itemized expense API sends line assignments and preserves server-calculated shares and details", async () => {
  signedIn();
  const items = [{ description: "Pizza", quantity: 2, amount: 15, memberIds: ["u1", "u2"] }];
  const body = { description: "Dinner", amount: 15, category: "FOOD", paidBy: "u1", splitType: "ITEMIZED", items };
  const saved = { _id: "itemized1", groupId: "g1", ...body, participants: [{ userId: { _id: "u1" }, amount: 7.5, percentage: null }, { userId: { _id: "u2" }, amount: 7.5, percentage: null }] };
  const writes = [];
  global.fetch = async request => {
    if (request.method !== "GET") {
      writes.push(await request.json());
      return respond(request.method === "POST" ? 201 : 200, { success: true, data: { expense: saved } });
    }
    return respond(200, { success: true, data: { expense: saved } });
  };
  const created = await store.dispatch(expensesApi.endpoints.createExpense.initiate({ groupId: "g1", body })).unwrap();
  assert.deepEqual(created.data.expense.items, items);
  assert.equal(created.data.expense.participants[0].amount, 7.5);
  const details = store.dispatch(expensesApi.endpoints.getExpense.initiate("itemized1"));
  try {
    assert.deepEqual((await details.unwrap()).data.expense.items, items);
    await store.dispatch(expensesApi.endpoints.updateExpense.initiate({ groupId: "g1", expenseId: "itemized1", body })).unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query => query.unwrap()));
    assert.deepEqual(writes, [body, body]);
    assert.ok(writes.every(body => !("participants" in body)));
  } finally { details.unsubscribe(); }
});

test("itemized tax and tip survive create, detail and update API round trips", async () => {
  signedIn();
  const adjustments = { tax: { amount: 2, allocation: "PROPORTIONAL" }, tip: { amount: 1, allocation: "EQUAL" } };
  const body = { description: "Dinner", amount: 13, category: "FOOD", paidBy: "u1", splitType: "ITEMIZED", items: [{ description: "Meal", quantity: 1, amount: 10, memberIds: ["u1", "u2"] }], adjustments };
  const saved = { _id: "extras1", groupId: "g1", ...body, participants: [{ userId: { _id: "u1" }, amount: 6.5 }, { userId: { _id: "u2" }, amount: 6.5 }] };
  const writes = [];
  global.fetch = async request => {
    if (request.method !== "GET") writes.push(await request.json());
    return respond(request.method === "POST" ? 201 : 200, { success: true, data: { expense: saved } });
  };
  const result = await store.dispatch(expensesApi.endpoints.createExpense.initiate({ groupId: "g1", body })).unwrap();
  assert.deepEqual(result.data.expense.adjustments, adjustments);
  const query = store.dispatch(expensesApi.endpoints.getExpense.initiate("extras1"));
  try {
    assert.deepEqual((await query.unwrap()).data.expense.adjustments, adjustments);
    await store.dispatch(expensesApi.endpoints.updateExpense.initiate({ groupId: "g1", expenseId: "extras1", body })).unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query => query.unwrap()));
    assert.deepEqual(writes, [body, body]);
  } finally { query.unsubscribe(); }
});

test("shares expense API sends weights and preserves calculated amounts for editing", async () => {
  signedIn();
  const body = { description: "Dinner", amount: 100, category: "FOOD", paidBy: "u1", splitType: "SHARES", participants: [{ userId: "u1", shares: 2 }, { userId: "u2", shares: 1 }] };
  const saved = { _id: "shares1", groupId: "g1", ...body, participants: [{ userId: { _id: "u1" }, shares: 2, amount: 66.67 }, { userId: { _id: "u2" }, shares: 1, amount: 33.33 }] };
  const writes = [];
  global.fetch = async request => {
    if (request.method !== "GET") writes.push(await request.json());
    return respond(request.method === "POST" ? 201 : 200, { success: true, data: { expense: saved } });
  };
  const created = await store.dispatch(expensesApi.endpoints.createExpense.initiate({ groupId: "g1", body })).unwrap();
  assert.deepEqual(created.data.expense.participants, saved.participants);
  const details = store.dispatch(expensesApi.endpoints.getExpense.initiate("shares1"));
  try {
    assert.deepEqual((await details.unwrap()).data.expense.participants, saved.participants);
    await store.dispatch(expensesApi.endpoints.updateExpense.initiate({ groupId: "g1", expenseId: "shares1", body })).unwrap();
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query => query.unwrap()));
    assert.deepEqual(writes, [body, body]);
  } finally { details.unsubscribe(); }
});

test("recurring expense creation and schedule management preserve splits and refresh details", async () => {
  signedIn();
  const recurring = { frequency: "MONTHLY", endDate: "2027-12-31" };
  const body = { description: "Subscription", amount: 30, category: "SUBSCRIPTIONS", paidBy: "u1", date: "2026-10-22T00:00:00.000Z", splitType: "SHARES", participants: [{ userId: "u1", shares: 2 }, { userId: "u2", shares: 1 }], recurring };
  const saved = { _id: "recurring1", groupId: "g1", ...body, recurring: { ...recurring, anchor: body.date, paused: false, nextNumber: 1, nextDate: "2026-11-22T00:00:00.000Z", lastError: "" }, participants: [{ userId: { _id: "u1" }, amount: 20, shares: 2 }, { userId: { _id: "u2" }, amount: 10, shares: 1 }] };
  const writes = [];
  global.fetch = async request => {
    if (request.method !== "GET") {
      const sent = await request.json(); writes.push({ method: request.method, url: request.url, body: sent });
      if (request.method === "PATCH") Object.assign(saved.recurring, sent);
    }
    return respond(request.method === "POST" ? 201 : 200, { success: true, data: { expense: saved } });
  };
  assert.equal((await store.dispatch(expensesApi.endpoints.createExpense.initiate({ groupId: "g1", body })).unwrap()).data.expense.recurring.frequency, "MONTHLY");
  const query = store.dispatch(expensesApi.endpoints.getExpense.initiate("recurring1"));
  try {
    await query.unwrap();
    for (const patch of [{ paused: true }, { paused: false }, { endDate: null }]) {
      await store.dispatch(expensesApi.endpoints.updateExpenseRecurrence.initiate({ groupId: "g1", expenseId: "recurring1", body: patch })).unwrap();
      await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query => query.unwrap()));
    }
    const details = expensesApi.endpoints.getExpense.select("recurring1")(store.getState()).data.data.expense;
    assert.equal(details.recurring.paused, false); assert.equal(details.recurring.endDate, null);
    assert.equal(details.participants[0].shares, 2);
    assert.deepEqual(writes.map(write => write.method), ["POST", "PATCH", "PATCH", "PATCH"]);
    assert.deepEqual(writes[0].body, body);
    assert.ok(writes.slice(1).every(write => write.url.endsWith("/expenses/recurring1/recurrence")));
  } finally { query.unsubscribe(); }
});
test("schedule conflicts preserve the signed-in session and surface a retryable error", async () => {
  signedIn();
  global.fetch = async () => respond(409, { success: false, message: "Schedule is processing. Try again shortly." });
  await assert.rejects(store.dispatch(expensesApi.endpoints.updateExpenseRecurrence.initiate({ groupId: "g1", expenseId: "e", body: { paused: true } })).unwrap(), error => error.status === 409);
  assert.ok(store.getState().auth.token);
});

test("bill payment refreshes expense lists and preserves reciprocal links on replay", async()=>{
 signedIn();
 let paid=false;const writes=[];let reads=0;
 const expense={_id:"linked1",billId:"billLinked",groupId:"gLink",amount:100,paidBy:{_id:"u1"},splitType:"EQUAL",participants:[{userId:{_id:"u1"},amount:50},{userId:{_id:"u2"},amount:50}]};
 global.fetch=async request=>{
  if(request.method==="POST"){
   assert.equal(new URL(request.url).pathname,"/api/bills/billLinked/pay");writes.push(await request.json());paid=true;
   return respond(200,{success:true,data:{bill:{_id:"billLinked",groupId:"gLink",status:"PAID",expenseId:"linked1"},expense}});
  }
  reads++;return respond(200,{success:true,data:{expenses:paid?[expense]:[]},pagination:{page:1,total:paid?1:0}});
 };
 const query=store.dispatch(expensesApi.endpoints.getGroupExpenses.initiate({groupId:"gLink"}));
 const body={paidBy:"u1",splitType:"SHARES",participants:[{userId:"u1",shares:2},{userId:"u2",shares:1}]};
 try{
  await query.unwrap();
  for(let i=0;i<2;i++){
   const result=await store.dispatch(billsApi.endpoints.markBillPaid.initiate({groupId:"gLink",billId:"billLinked",body})).unwrap();
   assert.equal(result.data.bill.expenseId,result.data.expense._id);assert.equal(result.data.expense.billId,"billLinked");
   await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query=>query.unwrap()));
  }
  assert.equal(reads,3);assert.deepEqual(writes,[body,body]);
  assert.equal(expensesApi.endpoints.getGroupExpenses.select({groupId:"gLink"})(store.getState()).data.data.expenses.length,1);
 }finally{query.unsubscribe();}
});
test("pending bill payments can be finished with the saved settings without a new payer selection", async()=>{
 signedIn();let calls=0;
 global.fetch=async request=>{calls++;assert.deepEqual(await request.json(),{resume:true});return respond(200,{success:true,data:{bill:{_id:"bResume",status:"PAID",expenseId:"eResume"}}});};
 const result=await store.dispatch(billsApi.endpoints.markBillPaid.initiate({groupId:"gResume",billId:"bResume",body:{resume:true}})).unwrap();
 assert.equal(result.data.bill.expenseId,"eResume");assert.equal(calls,1);
});

test("upcoming and history requests stay separate and PAID dashboard shortcuts open history",async()=>{
 signedIn();const requests=[];
 global.fetch=async request=>{const params=Object.fromEntries(new URL(request.url).searchParams);requests.push(params);return respond(200,{success:true,data:{bills:[{_id:params.view}]}});};
 const cases=[{groupId:"gViews"},{groupId:"gViews",view:"history"},{groupId:"gViews",view:"upcoming",status:"OVERDUE"},{groupId:"gViews",status:"PAID"}];
 for(const args of cases) await store.dispatch(billsApi.endpoints.getGroupBills.initiate(args,{subscribe:false})).unwrap();
 assert.deepEqual(requests.map(item=>item.view),["upcoming","history","upcoming","history"]);
 assert.equal(requests[2].status,"OVERDUE");assert.equal(requests[3].status,"PAID");
 assert.equal(billsApi.endpoints.getGroupBills.select(cases[0])(store.getState()).data.data.bills[0]._id,"upcoming");
 assert.equal(billsApi.endpoints.getGroupBills.select(cases[1])(store.getState()).data.data.bills[0]._id,"history");
});

test("soft-delete and restore use separate group actions, preserving the permanent-delete contract",async()=>{
 signedIn();let hidden=false;let activeReads=0;let deletedReads=0;const writes=[];
 global.fetch=async request=>{
  const path=new URL(request.url).pathname;
  if(request.method==='POST'){writes.push(path);hidden=path.endsWith('/soft-delete');return respond(200,{success:true,message:'Updated'});}
  const deleted=path.endsWith('/deleted');if(deleted)deletedReads++;else activeReads++;
  return respond(200,{success:true,data:{groups:(deleted?hidden:!hidden)?[{id:'gSoft',name:'Trip',role:'OWNER'}]:[]}});
 };
 const active=store.dispatch(groupsApi.endpoints.getMyGroups.initiate());
 const deleted=store.dispatch(groupsApi.endpoints.getDeletedGroups.initiate());
 try{
  await Promise.all([active.unwrap(),deleted.unwrap()]);
  await store.dispatch(groupsApi.endpoints.softDeleteGroup.initiate('gSoft')).unwrap();
  await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query=>query.unwrap()));
  assert.equal(groupsApi.endpoints.getMyGroups.select()(store.getState()).data.data.groups.length,0);
  assert.equal(groupsApi.endpoints.getDeletedGroups.select()(store.getState()).data.data.groups.length,1);
  await store.dispatch(groupsApi.endpoints.restoreGroup.initiate('gSoft')).unwrap();
  await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query=>query.unwrap()));
  assert.equal(groupsApi.endpoints.getMyGroups.select()(store.getState()).data.data.groups.length,1);
  assert.equal(groupsApi.endpoints.getDeletedGroups.select()(store.getState()).data.data.groups.length,0);
  assert.deepEqual(writes,['/api/groups/gSoft/soft-delete','/api/groups/gSoft/restore']);
  assert.equal(activeReads,3);assert.equal(deletedReads,3);
 }finally{active.unsubscribe();deleted.unsubscribe();}
});

test("activity history separates groups and pages and refreshes after expense, payment, and settings mutations",async()=>{
 const {activityApi}=require('../src/features/activity/activityApi.ts');
 signedIn();const reads=[];
 global.fetch=async request=>{
  const url=new URL(request.url);
  if(url.pathname.endsWith('/activity')) {reads.push(url.pathname+url.search);return respond(200,{success:true,data:{activities:[{_id:url.pathname+url.search,action:'EXPENSE_DELETED',label:'Dinner',actor:null,occurredAt:'2026-10-24T00:00:00Z'}],pagination:{page:Number(url.searchParams.get('page')),limit:20,total:21,totalPages:2}}});}
  return respond(200,{success:true,data:{expense:{_id:'e'},bill:{_id:'b'},group:{_id:'g'}}});
 };
 const args=[{groupId:'gActivity',page:1},{groupId:'gActivity',page:2},{groupId:'other',page:1}];
 const queries=args.map(arg=>store.dispatch(activityApi.endpoints.getGroupActivity.initiate(arg)));
 try{
  await Promise.all(queries.map(query=>query.unwrap()));
  assert.equal(reads.length,3);assert.ok(reads[0].includes('page=1&limit=20'));
  assert.notEqual(activityApi.endpoints.getGroupActivity.select(args[0])(store.getState()).data.data.activities[0]._id,activityApi.endpoints.getGroupActivity.select(args[1])(store.getState()).data.data.activities[0]._id);
  for(const mutation of [expensesApi.endpoints.deleteExpense.initiate({groupId:'gActivity',expenseId:'e'}),billsApi.endpoints.markBillPaid.initiate({groupId:'gActivity',billId:'b',body:{resume:true}}),groupsApi.endpoints.renameGroup.initiate({groupId:'gActivity',name:'Holiday'})]){
   await store.dispatch(mutation).unwrap();
   await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()).map(query=>query.unwrap()));
  }
  assert.equal(reads.length,12);
 }finally{queries.forEach(query=>query.unsubscribe());}
});
test("activity detail formatting preserves native precision, old values, item assignments and missing members",()=>{
 const {activityValue}=require('../src/features/activity/format.ts');
 assert.equal(activityValue(123,'amount','JPY'),'JPY 123');assert.equal(activityValue(.003,'amount','KWD'),'KWD 0.003');
 assert.equal(activityValue('SHARES','splitType','PHP'),'By shares');assert.equal(activityValue(null,'notes','PHP'),'None');
 assert.match(activityValue([{userId:'a',amount:10,shares:2}],'participants','PHP',{a:'Sam'}),/Sam: PHP 10.00 \(2 shares\)/);
 assert.match(activityValue([{description:'Meal',quantity:1,amount:10,memberIds:['missing']}],'items','PHP'),/Unavailable member/);
});

test("password reset requests use public backend contracts without signing in", async () => {
  const calls = [];
  global.fetch = async (request) => {
    calls.push({ url: request.url, method: request.method, body: await request.json() });
    assert.equal(request.headers.get("Authorization"), null);
    return respond(200, { success: true, message: "Check your email." });
  };
  await store.dispatch(authApi.endpoints.requestPasswordReset.initiate({ email: user.email })).unwrap();
  await store.dispatch(authApi.endpoints.resetPassword.initiate({ email: user.email, code: "01234567", password: "new-password-123" })).unwrap();
  assert.deepEqual(calls, [
    { url: "https://divvy.test/api/auth/forgot-password", method: "POST", body: { email: user.email } },
    { url: "https://divvy.test/api/auth/reset-password", method: "POST", body: { email: user.email, code: "01234567", password: "new-password-123" } },
  ]);
  assert.equal(store.getState().auth.user, null);
  assert.equal(savedToken, null);
});

test("reset errors remain retryable and do not create a session", async () => {
  for (const status of [400, 429, 503]) {
    global.fetch = async () => respond(status, { success: false, message: "Try again." });
    await assert.rejects(store.dispatch(authApi.endpoints.resetPassword.initiate({ email: user.email, code: "01234567", password: "new-password-123" })).unwrap(), (error) => error.status === status);
    assert.equal(store.getState().auth.user, null);
  }
});

test("password reset validation matches backend email, code, confirmation and UTF-8 limits", () => {
  const { passwordResetErrors, resetEmailError } = require("../src/features/auth/passwordResetForm.ts");
  assert.equal(resetEmailError(" test@example.com "), undefined);
  assert.ok(resetEmailError("invalid"));
  assert.ok(resetEmailError(`${"a".repeat(250)}@example.com`));
  assert.deepEqual(passwordResetErrors(user.email, "01234567", "password123", "password123"), {});
  assert.deepEqual(passwordResetErrors(user.email, "01234567", "😀".repeat(18), "😀".repeat(18)), {});
  assert.ok(passwordResetErrors(user.email, "01234567", "😀".repeat(19), "😀".repeat(19)).password);
  assert.ok(passwordResetErrors(user.email, "123", "short", "different").code);
  assert.ok(passwordResetErrors(user.email, "123", "short", "different").password);
  assert.ok(passwordResetErrors(user.email, "123", "short", "different").confirmation);
});

test("invitation creation normalizes email and exposes a code without adding a member", async () => {
  const { invitationsApi } = require("../src/features/groups/invitationsApi.ts");
  signedIn();
  global.fetch = async request => {
    assert.equal(request.url, "https://divvy.test/api/groups/g1/invitations");
    assert.equal(request.method, "POST");
    assert.deepEqual(await request.json(), { email: "friend@example.com" });
    return respond(201, { success: true, data: { invitation: { id: "i1", status: "PENDING" }, code: "a".repeat(32) } });
  };
  const result = await store.dispatch(invitationsApi.endpoints.createInvitation.initiate({ groupId: "g1", email: " FRIEND@example.com " })).unwrap();
  assert.equal(result.data.invitation.status, "PENDING");
  assert.equal(result.data.code, "a".repeat(32));
});

test("invitation inbox, lookup, accept, decline and revoke use separate authenticated contracts", async () => {
  const { invitationsApi } = require("../src/features/groups/invitationsApi.ts");
  signedIn(); const calls = [];
  global.fetch = async request => {
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    calls.push({ path: new URL(request.url).pathname, method: request.method, body: request.method === "POST" ? await request.json() : null });
    return respond(200, { success: true, data: { invitations: [], invitation: { id: "i1", status: "ACCEPTED" } } });
  };
  const incoming = store.dispatch(invitationsApi.endpoints.getInvitations.initiate()); await incoming.unwrap(); incoming.unsubscribe();
  const outgoing = store.dispatch(invitationsApi.endpoints.getGroupInvitations.initiate("g1")); await outgoing.unwrap(); outgoing.unsubscribe();
  const createdAt = "2026-10-27T00:00:00.000Z";
  await store.dispatch(invitationsApi.endpoints.lookupInvitation.initiate(` ${"A".repeat(32)} `)).unwrap();
  await store.dispatch(invitationsApi.endpoints.acceptInvitation.initiate({ id: "i1", createdAt, code: "A".repeat(32) })).unwrap();
  await store.dispatch(invitationsApi.endpoints.declineInvitation.initiate({ id: "i2", createdAt })).unwrap();
  await store.dispatch(invitationsApi.endpoints.revokeInvitation.initiate({ id: "i3", groupId: "g1", createdAt })).unwrap();
  assert.deepEqual(calls, [
    { path: "/api/invitations", method: "GET", body: null },
    { path: "/api/groups/g1/invitations", method: "GET", body: null },
    { path: "/api/invitations/lookup", method: "POST", body: { code: "a".repeat(32) } },
    { path: "/api/invitations/i1/accept", method: "POST", body: { createdAt, code: "a".repeat(32) } },
    { path: "/api/invitations/i2/decline", method: "POST", body: { createdAt } },
    { path: "/api/groups/g1/invitations/i3/revoke", method: "POST", body: { createdAt } },
  ]);
});

test("invitation acceptance refreshes group/member caches; failed acceptance preserves existing membership", async () => {
  const { invitationsApi } = require("../src/features/groups/invitationsApi.ts");
  const { groupsApi } = require("../src/features/groups/groupsApi.ts");
  signedIn(); let groupFetches = 0; let fail = false;
  global.fetch = async request => {
    if (request.method === "GET") { groupFetches++; return respond(200, { success: true, data: { groups: [] } }); }
    return fail ? respond(409, { success: false, message: "Invitation changed" }) : respond(200, { success: true, data: { invitation: { id: "i1", status: "ACCEPTED" } } });
  };
  const groups = store.dispatch(groupsApi.endpoints.getMyGroups.initiate()); await groups.unwrap();
  await store.dispatch(invitationsApi.endpoints.acceptInvitation.initiate({ id: "i1", createdAt: "2026-10-27T00:00:00.000Z", code: "a".repeat(32) })).unwrap();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(groupFetches, 2);
  fail = true;
  await assert.rejects(store.dispatch(invitationsApi.endpoints.acceptInvitation.initiate({ id: "i1", createdAt: "2026-10-27T00:00:00.000Z", code: "a".repeat(32) })).unwrap());
  assert.equal(groupFetches, 2);
  assert.equal(store.getState().auth.user.id, user.id);
  groups.unsubscribe();
});

test("push device registration, status, disabling and testing use authenticated POST bodies", async () => {
  const { notificationsApi } = require("../src/features/notifications/notificationsApi.ts");
  signedIn(); const calls = [];
  const token = "ExpoPushToken[abcdefghijklmnop]";
  global.fetch = async request => {
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    calls.push({ path: new URL(request.url).pathname, method: request.method, body: await request.json() });
    return respond(200, { success: true, data: { device: { enabled: true } } });
  };
  await store.dispatch(notificationsApi.endpoints.registerPushDevice.initiate({ token, timeZone: "Asia/Manila" })).unwrap();
  await store.dispatch(notificationsApi.endpoints.getPushDeviceStatus.initiate({ token })).unwrap();
  await store.dispatch(notificationsApi.endpoints.testPushDevice.initiate({ token })).unwrap();
  await store.dispatch(notificationsApi.endpoints.disablePushDevice.initiate({ token })).unwrap();
  assert.deepEqual(calls, [
    { path: "/api/notifications/devices", method: "POST", body: { token, timeZone: "Asia/Manila" } },
    { path: "/api/notifications/status", method: "POST", body: { token } },
    { path: "/api/notifications/test", method: "POST", body: { token } },
    { path: "/api/notifications/devices", method: "DELETE", body: { token } },
  ]);
});

test("notification taps are account-bound and map only validated IDs to app bill routes", () => {
  const { notificationRoute } = require("../src/features/notifications/notificationRoute.ts");
  const groupId = "a".repeat(24), billId = "b".repeat(24);
  assert.equal(notificationRoute(undefined, "u1"), null);
  assert.equal(notificationRoute({ type: "bill-reminder", userId: "other", groupId }, "u1"), null);
  assert.equal(notificationRoute({ type: "unknown", userId: "u1" }, "u1"), null);
  assert.deepEqual(notificationRoute({ type: "bill-reminder", userId: "u1", groupId, billId }, "u1"), { pathname: "/groups/[groupId]/bills/[billId]", params: { groupId, billId } });
  assert.deepEqual(notificationRoute({ type: "bill-reminder", userId: "u1", groupId }, "u1"), { pathname: "/groups/[groupId]/bills", params: { groupId } });
  assert.equal(notificationRoute({ type: "bill-reminder", userId: "u1", groupId: "../../profile", url: "https://bad.example" }, "u1"), "/groups");
});

test("inbox read actions refresh both history and the bell count", async () => {
  const { notificationsApi } = require("../src/features/notifications/notificationsApi.ts");
  signedIn(); let count = 2; let countFetches = 0; let listFetches = 0;
  global.fetch = async request => {
    assert.equal(request.headers.get("Authorization"), "Bearer saved-token");
    const url = new URL(request.url);
    if (url.pathname.endsWith("unread-count")) { countFetches++; return respond(200, { success: true, data: { unreadCount: count } }); }
    if (url.pathname.endsWith("inbox")) { listFetches++; assert.equal(url.searchParams.get("page"), "1"); return respond(200, { success: true, data: { notifications: [], unreadCount: count, pagination: { page: 1, total: 2, totalPages: 1 } } }); }
    assert.equal(request.method, "POST");
    if (url.pathname.endsWith("read-all")) count = 0;
    else { assert.equal(url.pathname, "/api/notifications/inbox/n1/read"); count = 1; }
    return respond(200, { success: true });
  };
  const bell = store.dispatch(notificationsApi.endpoints.getUnreadCount.initiate());
  const history = store.dispatch(notificationsApi.endpoints.getInbox.initiate(1));
  await Promise.all([bell.unwrap(), history.unwrap()]);
  await store.dispatch(notificationsApi.endpoints.readNotification.initiate("n1")).unwrap();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(notificationsApi.endpoints.getUnreadCount.select()(store.getState()).data.data.unreadCount, 1);
  await store.dispatch(notificationsApi.endpoints.readAllNotifications.initiate()).unwrap();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(notificationsApi.endpoints.getUnreadCount.select()(store.getState()).data.data.unreadCount, 0);
  assert.equal(countFetches, 3); assert.equal(listFetches, 3);
  bell.unsubscribe(); history.unsubscribe();
});

test("a failed inbox read remains unread and does not clear the session", async () => {
  const { notificationsApi } = require("../src/features/notifications/notificationsApi.ts");
  signedIn();
  global.fetch = async request => request.method === "GET" ? respond(200, { success: true, data: { unreadCount: 1 } }) : respond(503, { success: false, message: "Try again" });
  const bell = store.dispatch(notificationsApi.endpoints.getUnreadCount.initiate()); await bell.unwrap();
  await assert.rejects(store.dispatch(notificationsApi.endpoints.readNotification.initiate("n1")).unwrap());
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(notificationsApi.endpoints.getUnreadCount.select()(store.getState()).data.data.unreadCount, 1);
  assert.equal(store.getState().auth.user.id, user.id);
  bell.unsubscribe();
});
