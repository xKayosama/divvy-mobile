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

test("expense filters reach the server and use separate caches for ranges and pages", async () => {
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
    category: "FOOD",
    startDate: "2026-10-01",
    endDate: "2026-10-15",
  };
  const args = [
    filters,
    { ...filters, page: 2 },
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
      category: "FOOD",
      startDate: "2026-10-01",
      endDate: "2026-10-15",
    },
    {
      page: "2",
      limit: "10",
      category: "FOOD",
      startDate: "2026-10-01",
      endDate: "2026-10-15",
    },
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
