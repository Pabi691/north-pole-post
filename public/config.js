/* ─────────────────────────────────────────────────────────────
   YOUR BUSINESS DETAILS — edit the values on the right.
   These show up on all your policy pages (Terms, Privacy, etc.)
   and in the footer. Change them here once; every page updates.
   ───────────────────────────────────────────────────────────── */
window.SITE = {
  brand:        "North Pole Post",                                   // your shop name
  legalName:    "Pabitra Haldar",                                    // your legal name (Individual account)
  email:        "hello.northpolepost@gmail.com",                     // your contact email
  phone:        "",                                                  // optional — add a number here later if you like, e.g. "+91 9XXXXXXXXX"
  city:         "Raidighi, South 24 Parganas, West Bengal 743349",   // your location
  priceRupees:  "10",                                                // price shown on the Pricing page (match PRICE_PAISE ÷ 100)
  effectiveDate:"24 October 2026"                                    // the "last updated" date on the policies
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
  // Hide the Phone row on the Contact page if no phone is set
  var phoneRow = document.getElementById("phone-row");
  if (phoneRow && !S.phone) phoneRow.style.display = "none";

  // Keep the Pricing page price in sync with the live admin price
  try {
    if (document.querySelector('[data-site="priceRupees"]')) {
      fetch('/api/site-config').then(function (r) { return r.json(); }).then(function (c) {
        if (c && c.season && c.season.pricePaise != null) {
          var rupees = c.season.pricePaise / 100;
          var txt = (rupees % 1 === 0) ? rupees.toFixed(0) : rupees.toFixed(2);
          document.querySelectorAll('[data-site="priceRupees"]').forEach(function (el) { el.textContent = txt; });
        }
      }).catch(function () {});
    }
  } catch (e) {}
});
