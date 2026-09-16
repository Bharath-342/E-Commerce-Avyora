/* ==================================================
   AVYORA - THEME MANAGEMENT
   File: src/theme.js
   ================================================== */


/* ==================================================
   DEFAULT SETTINGS
   ================================================== */

const DEFAULT_THEME = "light";

const DEFAULT_LIGHT_BRIGHTNESS = 100;

const DEFAULT_DARK_BRIGHTNESS = 100;


/* ==================================================
   LOAD SAVED SETTINGS
   ================================================== */

let currentTheme =
    localStorage.getItem("avyora-theme") || DEFAULT_THEME;


let lightBrightness =
    Number(
        localStorage.getItem("avyora-light-brightness")
    ) || DEFAULT_LIGHT_BRIGHTNESS;


let darkBrightness =
    Number(
        localStorage.getItem("avyora-dark-brightness")
    ) || DEFAULT_DARK_BRIGHTNESS;


/* ==================================================
   APPLY THEME
   ================================================== */

function applyTheme() {

    document.documentElement.setAttribute(
        "data-theme",
        currentTheme
    );

    document.documentElement.setAttribute(
        "data-bs-theme",
        currentTheme
    );


    const brightness =
        currentTheme === "light"
            ? lightBrightness
            : darkBrightness;


    document.documentElement.style.setProperty(
        "--theme-brightness",
        brightness / 100
    );


    updateThemeUI();

}


/* ==================================================
   UPDATE UI
   ================================================== */

function updateThemeUI() {
    const themeLogos =
        document.querySelectorAll(
            ".theme-logo"
        );

    themeLogos.forEach(
        function (logo) {

            logo.src =
                currentTheme === "dark"
                    ? "/avyora-logo-dark.png"
                    : "/avyora-logo.png";

        }
    );

    const lightOption =
        document.getElementById("lightThemeOption");

    const darkOption =
        document.getElementById("darkThemeOption");

    const brightnessSlider =
        document.getElementById("brightnessSlider");

    const brightnessValue =
        document.getElementById("brightnessValue");

    const themeIcon =
        document.getElementById("themeIcon");


    if (!lightOption ||
        !darkOption ||
        !brightnessSlider ||
        !brightnessValue ||
        !themeIcon) {

        return;

    }


    /* Active theme */

    lightOption.classList.toggle(
        "active",
        currentTheme === "light"
    );


    darkOption.classList.toggle(
        "active",
        currentTheme === "dark"
    );


    /* Current brightness */

    const brightness =
        currentTheme === "light"
            ? lightBrightness
            : darkBrightness;


    brightnessSlider.value = brightness;


    brightnessValue.textContent =
        `${brightness}%`;


    /* Theme icon */

    if (currentTheme === "light") {

        themeIcon.className =
            "bi bi-sun";

    } else {

        themeIcon.className =
            "bi bi-moon-stars";

    }

}


/* ==================================================
   CHANGE THEME
   ================================================== */

function changeTheme(theme) {

    currentTheme = theme;


    localStorage.setItem(
        "avyora-theme",
        currentTheme
    );


    applyTheme();

}


/* ==================================================
   CHANGE BRIGHTNESS
   ================================================== */

function changeBrightness(value) {

    const brightness =
        Number(value);


    if (currentTheme === "light") {

        lightBrightness = brightness;

        localStorage.setItem(
            "avyora-light-brightness",
            lightBrightness
        );

    } else {

        darkBrightness = brightness;

        localStorage.setItem(
            "avyora-dark-brightness",
            darkBrightness
        );

    }


    document.documentElement.style.setProperty(
        "--theme-brightness",
        brightness / 100
    );


    const brightnessValue =
        document.getElementById(
            "brightnessValue"
        );


    if (brightnessValue) {

        brightnessValue.textContent =
            `${brightness}%`;

    }

}


/* ==================================================
   EVENTS
   ================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {


        /* Light */

        const lightOption =
            document.getElementById(
                "lightThemeOption"
            );


        if (lightOption) {

            lightOption.addEventListener(
                "click",
                function () {

                    changeTheme("light");

                }
            );

        }


        /* Dark */

        const darkOption =
            document.getElementById(
                "darkThemeOption"
            );


        if (darkOption) {

            darkOption.addEventListener(
                "click",
                function () {

                    changeTheme("dark");

                }
            );

        }


        /* Brightness */

        const brightnessSlider =
            document.getElementById(
                "brightnessSlider"
            );


        if (brightnessSlider) {

            brightnessSlider.addEventListener(
                "input",
                function () {

                    changeBrightness(
                        this.value
                    );

                }
            );

        }


        /* Initial settings */

        applyTheme();

    }
);