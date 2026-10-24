/* ─────────────────────────────────────────────────────────────
   YOUR BUSINESS DETAILS — edit the values on the right.
   These show up on all your policy pages (Terms, Privacy, etc.)
   and in the footer. Change them here once; every page updates.
   ⚠️ Razorpay needs these to be REAL before live activation.
   ───────────────────────────────────────────────────────────── */
window.SITE = {
  brand:        "North Pole Post",          // your shop name
  legalName:    "North Pole Post",          // your legal / proprietor name (your full name for an Individual account)
  email:        "youremail@gmail.com",      // ⚠️ UPDATE: your real contact email
  phone:        "+91 90000 00000",          // ⚠️ UPDATE: your real phone (or remove if you prefer)
  city:         "India",                    // ⚠️ UPDATE: e.g. "Pune, Maharashtra"
  priceRupees:  "10",                       // the price shown on the Pricing page (match PRICE_PAISE ÷ 100)
  effectiveDate:"24 October 2026"           // the "last updated" date on the policies
};

/* Fills any element marked like <span data-site="email"></span> */
document.addEventListener("DOMContentLoaded", function () {
  var S = window.SITE || {};
  document.querySelectorAll("[data-site]").forEach(function (el) {
    var key = el.getAttribute("data-site");
    if (S[key] != null) el.textContent = S[key];
  });
  var yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
  var mail = document.getElementById("email-link");
  if (mail && S.email) { mail.href = "mailto:" + S.email; mail.textContent = S.email; }
});
