/**
 * The gate screens shown instead of the tabs until you're fully signed in:
 * sign in / sign up / forgot password, "check your email", "not allowed", loading.
 * Errors are shown inline in a pixel error box (never silently swallowed).
 */
import { h, raw } from "../core/dom.js";
import { sparkle, heart } from "../art/sprites.js";
import { explainError } from "../ui/toast.js";
import * as A from "../firebase/auth.js";

function errorBox() {
  const el = h("div.toast.error.pbox", { style: { display: "none" }, role: "alert" });
  return {
    el,
    show(e, kind = "error") {
      el.className = "toast pbox " + kind;
      el.textContent = typeof e === "string" ? e : explainError(e);
      el.style.display = "";
    },
    hide() { el.style.display = "none"; },
  };
}

/** Disable a button while an async action runs, and show errors. */
function busy(btn, msg, fn) {
  return async e => {
    e?.preventDefault?.();
    msg.hide();
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = "...";
    try { await fn(); }
    catch (err) { console.error(err); msg.show(err); }
    finally { btn.disabled = false; btn.textContent = label; }
  };
}

const title = text => h("div.vhead", {}, h("h2", {}, text), raw(sparkle(2)));

/* ---------------- sign in / sign up / forgot ---------------- */

function formView(el) {
  let mode = "signin";
  const msg = errorBox();
  const name = h("input.pinput", { placeholder: "Display name", maxLength: 30, autocomplete: "nickname" });
  const email = h("input.pinput", { type: "email", placeholder: "Email", autocomplete: "email" });
  const pass = h("input.pinput", { type: "password", placeholder: "Password (6+ chars)", autocomplete: "current-password" });
  const submit = h("button.pbtn.accent", { type: "submit" });
  const tabs = {
    signin: h("button.pbtn.small", { type: "button", onclick: () => setMode("signin") }, "SIGN IN"),
    signup: h("button.pbtn.small", { type: "button", onclick: () => setMode("signup") }, "NEW HERE"),
  };
  const forgot = h("button.pbtn.small", { type: "button", onclick: () => setMode(mode === "forgot" ? "signin" : "forgot") });
  const hint = h("p.muted", { style: { fontSize: "16px" } });

  const form = h("form.card.pbox.authform", {
    onsubmit: busy(submit, msg, async () => {
      if (mode === "signup") {
        if (!name.value.trim()) throw new Error("Pick a display name first.");
        await A.signUp(name.value, email.value, pass.value);
      } else if (mode === "signin") {
        await A.signIn(email.value, pass.value);
      } else {
        await A.resetPassword(email.value);
        msg.show("If that email has an account, a reset link is on its way.", "info");
      }
    }),
  }, h("div.seg", {}, tabs.signin, tabs.signup), name, email, pass, submit, msg.el, h("div.row", {}, hint, h("span.grow"), forgot));

  function setMode(m) {
    mode = m;
    msg.hide();
    tabs.signin.setAttribute("aria-pressed", String(m === "signin"));
    tabs.signup.setAttribute("aria-pressed", String(m === "signup"));
    name.style.display = m === "signup" ? "" : "none";
    pass.style.display = m === "forgot" ? "none" : "";
    pass.autocomplete = m === "signup" ? "new-password" : "current-password";
    submit.textContent = { signin: "START ▶", signup: "CREATE ACCOUNT", forgot: "SEND RESET LINK" }[m];
    forgot.textContent = m === "forgot" ? "BACK" : "FORGOT?";
    hint.textContent = m === "signup" ? "Only the two invited emails can get in." : "";
    (m === "signup" ? name : email).focus();
  }

  el.append(title("WELCOME, PLAYER"), form);
  setMode("signin");
}

/* ---------------- verify email ---------------- */

function verifyView(el, { store, actions }) {
  const msg = errorBox();
  const done = h("button.pbtn.accent", {}, "I'M VERIFIED ✓");
  const resend = h("button.pbtn.small", {}, "RESEND EMAIL");
  done.onclick = busy(done, msg, async () => {
    const r = await A.checkVerified();
    if (r.status === "unverified") msg.show("Not verified yet. Click the link in the email first (check spam too).", "warn");
    else actions.enter(r); // starts sync, buddy and chat (onAuthStateChanged won't fire again)
  });
  resend.onclick = busy(resend, msg, async () => {
    await A.resendVerification();
    msg.show("Sent! It can take a minute to arrive.", "info");
    resend.disabled = true;               // cool-down: Firebase rate-limits this
    setTimeout(() => (resend.disabled = false), 60_000);
  });
  el.append(
    title("CHECK YOUR EMAIL"),
    h("div.card.pbox.authform", {},
      h("p", {}, "We sent a link to ", h("b.selectable", {}, store.get().auth.user.email), "."),
      h("p.muted", {}, "Click it, then come back and press the button."),
      done, msg.el,
      h("div.row", {}, resend, h("span.grow"), h("button.pbtn.small", { onclick: () => A.signOut() }, "SIGN OUT"))),
  );
}

/* ---------------- not on the allowed list ---------------- */

function deniedView(el, { store }) {
  const a = store.get().auth;
  el.append(
    title("NO ENTRY"),
    h("div.card.pbox.authform", {},
      h("p", {}, h("b.selectable", {}, a.user.email), " isn't on this app's guest list."),
      h("p.muted", {}, a.error ? explainError(a.error) : "Ask the owner to add you, or sign in with your invited email."),
      h("button.pbtn", { onclick: () => A.signOut() }, "SIGN OUT")),
  );
}

/* ---------------- loading ---------------- */

function loadingView(el) {
  el.append(h("div.card.pbox.placeholder", {}, raw(heart(4)), h("p.label", {}, "LOADING...")));
}

export const authView = {
  mount(el, ctx) {
    const status = ctx.store.get().auth.status;
    ({ signedOut: formView, unverified: verifyView, denied: deniedView }[status] || loadingView)(el, ctx);
    return {};
  },
};
