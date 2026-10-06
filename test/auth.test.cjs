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
