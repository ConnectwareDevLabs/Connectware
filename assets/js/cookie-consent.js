/**
 * Connectware Cookie Consent & Google Consent Mode Handler
 * Compliant with GDPR, CCPA, and DPDP Act.
 */
(function() {
  "use strict";

  const STORAGE_KEY = "cw_cookie_consent";

  function getConsent() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(consent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {
      console.warn("Could not save cookie consent:", e);
    }
    applyConsent(consent);
  }

  function applyConsent(consent) {
    const analyticsGranted = consent && consent.analytics === true;
    const marketingGranted = consent && consent.marketing === true;

    // Push consent state into Google Tag Manager / gtag Consent Mode
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }

    gtag("consent", "update", {
      "analytics_storage": analyticsGranted ? "granted" : "denied",
      "ad_storage": marketingGranted ? "granted" : "denied",
      "ad_user_data": marketingGranted ? "granted" : "denied",
      "ad_personalization": marketingGranted ? "granted" : "denied"
    });

    window.dataLayer.push({
      event: "cookie_consent_update",
      consent_analytics: analyticsGranted,
      consent_marketing: marketingGranted,
      consent_timestamp: consent.timestamp || new Date().toISOString()
    });
  }

  function createBannerHTML() {
    const banner = document.createElement("div");
    banner.id = "cwCookieBanner";
    banner.className = "cw-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Cookie Consent");

    banner.innerHTML = `
      <div class="cw-cookie-content">
        <div class="cw-cookie-header">
          <h4 class="cw-cookie-title">
            <i class="bi bi-shield-lock-fill"></i> Cookie &amp; Privacy Preferences
          </h4>
        </div>
        <p class="cw-cookie-text">
          We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and deliver relevant advertisements via Google AdSense. 
          You can accept all cookies, customize your choices, or opt out of non-essential cookies. Learn more in our 
          <a href="privacy-policy.html">Privacy Policy</a>.
        </p>

        <!-- Preferences panel (toggleable) -->
        <div class="cw-cookie-prefs-panel" id="cwCookiePrefsPanel">
          <div class="cw-cookie-category">
            <div class="cw-cookie-category-info">
              <h5>Strictly Necessary Cookies <span class="cw-cookie-badge">Always Active</span></h5>
              <p>Essential for basic website security, navigation, and core operations. These cannot be disabled.</p>
            </div>
            <label class="cw-switch">
              <input type="checkbox" checked disabled>
              <span class="cw-slider"></span>
            </label>
          </div>

          <div class="cw-cookie-category">
            <div class="cw-cookie-category-info">
              <h5>Analytics &amp; Performance Cookies</h5>
              <p>Allow us to measure traffic, popular pages, and performance to improve our website experience.</p>
            </div>
            <label class="cw-switch">
              <input type="checkbox" id="cwPrefAnalytics" checked>
              <span class="cw-slider"></span>
            </label>
          </div>

          <div class="cw-cookie-category">
            <div class="cw-cookie-category-info">
              <h5>Marketing &amp; Advertising Cookies</h5>
              <p>Used by Google AdSense and marketing partners to display personalized ads relevant to your interests.</p>
            </div>
            <label class="cw-switch">
              <input type="checkbox" id="cwPrefMarketing" checked>
              <span class="cw-slider"></span>
            </label>
          </div>
        </div>

        <div class="cw-cookie-actions">
          <button type="button" class="cw-cookie-btn cw-cookie-btn-accept" id="cwBtnAcceptAll">
            <i class="bi bi-check2"></i> Accept All
          </button>
          <button type="button" class="cw-cookie-btn cw-cookie-btn-reject" id="cwBtnRejectAll">
            Reject Non-Essential
          </button>
          <button type="button" class="cw-cookie-btn cw-cookie-btn-prefs" id="cwBtnTogglePrefs">
            Customize
          </button>
          <button type="button" class="cw-cookie-btn cw-cookie-btn-accept" id="cwBtnSavePrefs" style="display:none;">
            Save Preferences
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    bindBannerEvents(banner);
  }

  function bindBannerEvents(banner) {
    const btnAccept = banner.querySelector("#cwBtnAcceptAll");
    const btnReject = banner.querySelector("#cwBtnRejectAll");
    const btnTogglePrefs = banner.querySelector("#cwBtnTogglePrefs");
    const btnSavePrefs = banner.querySelector("#cwBtnSavePrefs");
    const prefsPanel = banner.querySelector("#cwCookiePrefsPanel");
    const prefAnalytics = banner.querySelector("#cwPrefAnalytics");
    const prefMarketing = banner.querySelector("#cwPrefMarketing");

    btnAccept.addEventListener("click", function() {
      const consent = {
        necessary: true,
        analytics: true,
        marketing: true,
        timestamp: new Date().toISOString()
      };
      saveConsent(consent);
      hideBanner(banner);
    });

    btnReject.addEventListener("click", function() {
      const consent = {
        necessary: true,
        analytics: false,
        marketing: false,
        timestamp: new Date().toISOString()
      };
      saveConsent(consent);
      hideBanner(banner);
    });

    btnTogglePrefs.addEventListener("click", function() {
      const isOpen = prefsPanel.classList.toggle("open");
      btnSavePrefs.style.display = isOpen ? "inline-flex" : "none";
      btnTogglePrefs.textContent = isOpen ? "Hide Options" : "Customize";
    });

    btnSavePrefs.addEventListener("click", function() {
      const consent = {
        necessary: true,
        analytics: prefAnalytics.checked,
        marketing: prefMarketing.checked,
        timestamp: new Date().toISOString()
      };
      saveConsent(consent);
      hideBanner(banner);
    });
  }

  function showBanner(banner) {
    banner.classList.add("show");
  }

  function hideBanner(banner) {
    banner.classList.remove("show");
  }

  window.openCookiePreferences = function() {
    let banner = document.getElementById("cwCookieBanner");
    if (!banner) {
      createBannerHTML();
      banner = document.getElementById("cwCookieBanner");
    }
    const current = getConsent() || { analytics: true, marketing: true };
    const prefAnalytics = banner.querySelector("#cwPrefAnalytics");
    const prefMarketing = banner.querySelector("#cwPrefMarketing");
    const prefsPanel = banner.querySelector("#cwCookiePrefsPanel");
    const btnSavePrefs = banner.querySelector("#cwBtnSavePrefs");
    const btnTogglePrefs = banner.querySelector("#cwBtnTogglePrefs");

    if (prefAnalytics) prefAnalytics.checked = !!current.analytics;
    if (prefMarketing) prefMarketing.checked = !!current.marketing;
    if (prefsPanel) prefsPanel.classList.add("open");
    if (btnSavePrefs) btnSavePrefs.style.display = "inline-flex";
    if (btnTogglePrefs) btnTogglePrefs.textContent = "Hide Options";

    showBanner(banner);
  };

  document.addEventListener("DOMContentLoaded", function() {
    const savedConsent = getConsent();
    if (!savedConsent) {
      createBannerHTML();
      const banner = document.getElementById("cwCookieBanner");
      setTimeout(function() {
        showBanner(banner);
      }, 700);
    } else {
      applyConsent(savedConsent);
    }

    // Attach listeners to any elements with data-open-cookie-settings or id="openCookieSettings"
    document.querySelectorAll('[data-open-cookie-settings], #openCookieSettings').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.preventDefault();
        window.openCookiePreferences();
      });
    });
  });
})();
