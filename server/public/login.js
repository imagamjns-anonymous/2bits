(function () {
  "use strict";

  const AUTH_KEY = "2bits-auth";

  if (localStorage.getItem(AUTH_KEY)) {
    window.location.replace("/");
    return;
  }

  const stepIdentifier = document.getElementById("stepIdentifier");
  const stepOtp = document.getElementById("stepOtp");
  const stepSuccess = document.getElementById("stepSuccess");

  const methodPhone = document.getElementById("methodPhone");
  const methodGoogle = document.getElementById("methodGoogle");

  const phoneField = document.getElementById("phoneField");
  const googleField = document.getElementById("googleField");
  const identifierForm = document.getElementById("identifierForm");
  const loginPhone = document.getElementById("loginPhone");
  const sendOtpBtn = document.getElementById("sendOtpBtn");

  const otpForm = document.getElementById("otpForm");
  const otpError = document.getElementById("otpError");
  const verifyOtpBtn = document.getElementById("verifyOtpBtn");
  const otpBackBtn = document.getElementById("otpBackBtn");
  const otpBoxes = document.querySelectorAll(".otp-box");
  const pinTitle = document.getElementById("pinTitle");
  const otpSentTo = document.getElementById("otpSentTo");

  let currentMethod = "phone";
  let userPhone = "";

  // ─── Method Toggle ──────────────────────────────────
  methodPhone.addEventListener("click", () => switchMethod("phone"));
  methodGoogle.addEventListener("click", () => switchMethod("google"));

  function switchMethod(method) {
    currentMethod = method;
    methodPhone.classList.toggle("active", method === "phone");
    methodGoogle.classList.toggle("active", method === "google");

    if (method === "phone") {
      phoneField.style.display = "";
      identifierForm.style.display = "";
      googleField.style.display = "none";
      loginPhone.focus();
    } else {
      phoneField.style.display = "none";
      identifierForm.style.display = "none";
      googleField.style.display = "";
    }
  }

  // ─── Phone Identifier Step ────────────────────────────────
  identifierForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const phone = loginPhone.value.trim();
    if (!phone || phone.replace(/\D/g, "").length < 8) {
      loginPhone.focus();
      return;
    }

    userPhone = phone.startsWith("+") ? phone : "+" + phone.replace(/\D/g, "");

    // Change text slightly if we are pretending it's a first time
    otpSentTo.textContent = `Enter your PIN for ${userPhone}`;
    showStep(stepOtp);
    otpBoxes[0].focus();
  });

  // ─── PIN Verify Step ──────────────────────────────
  otpForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const pin = Array.from(otpBoxes).map((b) => b.value).join("");

    if (pin.length < 6) {
      otpBoxes.forEach((b) => {
        if (!b.value) b.classList.add("error");
        setTimeout(() => b.classList.remove("error"), 600);
      });
      return;
    }

    verifyOtpBtn.disabled = true;
    verifyOtpBtn.querySelector("span:first-child").textContent = "Verifying…";
    hideOtpError();

    try {
      const response = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: userPhone, pin: pin }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to authenticate.");

      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify({
          ...payload.data.user,
          token: payload.data.token,
          loggedInAt: new Date().toISOString(),
        })
      );

      showStep(stepSuccess);
      setTimeout(() => {
        window.location.replace("/");
      }, 1400);

    } catch (error) {
      console.error("PIN error:", error);
      showOtpError(error.message);
      
      otpBoxes.forEach((b) => {
        b.value = "";
        b.classList.remove("filled");
        b.classList.add("error");
        setTimeout(() => b.classList.remove("error"), 600);
      });
      otpBoxes[0].focus();
      
      verifyOtpBtn.disabled = false;
      verifyOtpBtn.querySelector("span:first-child").textContent = "Sign In";
    }
  });

  // ─── PIN Input Behavior ─────────────────────────────
  otpBoxes.forEach((box, index) => {
    box.addEventListener("input", (e) => {
      const value = e.target.value.replace(/\D/g, "");
      e.target.value = value;

      if (value) {
        box.classList.add("filled");
        if (index < otpBoxes.length - 1) {
          otpBoxes[index + 1].focus();
        }
      } else {
        box.classList.remove("filled");
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !box.value && index > 0) {
        otpBoxes[index - 1].focus();
        otpBoxes[index - 1].value = "";
        otpBoxes[index - 1].classList.remove("filled");
      }
    });

    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
      pasted.split("").forEach((ch, i) => {
        if (otpBoxes[i]) {
          otpBoxes[i].value = ch;
          otpBoxes[i].classList.add("filled");
        }
      });
      const nextEmpty = Math.min(pasted.length, otpBoxes.length - 1);
      otpBoxes[nextEmpty].focus();
    });
  });

  // ─── Back Button ────────────────────────────────────
  otpBackBtn.addEventListener("click", () => {
    otpBoxes.forEach((b) => {
      b.value = "";
      b.classList.remove("filled", "error");
    });
    hideOtpError();
    verifyOtpBtn.disabled = false;
    verifyOtpBtn.querySelector("span:first-child").textContent = "Sign In";
    showStep(stepIdentifier);
  });

  // ─── Google Sign-In Stub ────────────────────────────
  const googleSignInBtn = document.getElementById("googleSignInBtn");
  if (googleSignInBtn) {
    googleSignInBtn.addEventListener("click", () => {
      alert("Google sign-in is disabled in PIN mode.");
    });
  }

  // ─── Helpers ────────────────────────────────────────
  function showStep(target) {
    [stepIdentifier, stepOtp, stepSuccess].forEach((s) => {
      s.style.display = s === target ? "" : "none";
    });
  }

  function showOtpError(msg) {
    otpError.textContent = msg;
    otpError.style.display = "";
  }

  function hideOtpError() {
    otpError.textContent = "";
    otpError.style.display = "none";
  }
})();
