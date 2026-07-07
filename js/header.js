"use strict";

/*
=========================================
START HOMEPAGE AT EXPANDED HEADER
=========================================
*/

function forceHomePageTop() {
    const currentPath =
        window.location.pathname;

    const isHomePage =
        currentPath.endsWith("/") ||
        currentPath.endsWith("/index.html");

    const isHomeHash =
        window.location.hash === "#home";

    if (
        !isHomePage ||
        (
            window.location.hash &&
            !isHomeHash
        )
    ) {
        return;
    }

    if (
        "scrollRestoration" in
        window.history
    ) {
        window.history.scrollRestoration =
            "manual";
    }

    if (isHomeHash) {
        window.history.replaceState(
            null,
            "",
            currentPath +
            window.location.search
        );
    }

    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
    });
}

forceHomePageTop();

document.addEventListener(
    "DOMContentLoaded",
    forceHomePageTop
);

window.addEventListener(
    "pageshow",
    forceHomePageTop
);


document.addEventListener(
    "DOMContentLoaded",
    initializeSmoothHeader
);

function initializeSmoothHeader() {
    const header =
        document.querySelector(".site-header");

    if (!header) {
        return;
    }

    const navigation =
        header.querySelector(".navigation");

    const brand =
        header.querySelector(".centered-brand");

    const logo =
        header.querySelector(".brand-logo-image");

    const links =
        header.querySelector(".nav-links");

    if (!navigation || !brand || !logo || !links) {
        return;
    }

    let currentProgress = 0;
    let targetProgress = 0;
    let animationFrame = null;

    function clamp(value, minimum, maximum) {
        return Math.min(
            Math.max(value, minimum),
            maximum
        );
    }

    function interpolate(start, end, progress) {
        return start + ((end - start) * progress);
    }

    function smoothstep(progress) {
        return (
            progress *
            progress *
            (3 - (2 * progress))
        );
    }

    function getTargetProgress() {
        const mobile =
            window.innerWidth <= 760;

        /*
        Longer distance = smoother gradual transition
        */
        const transitionDistance =
            mobile ? 220 : 300;

        const rawProgress = clamp(
            window.scrollY / transitionDistance,
            0,
            1
        );

        return smoothstep(rawProgress);
    }

    function renderHeader(progress) {
        const mobile =
            window.innerWidth <= 760;

        const containerWidth =
            navigation.clientWidth;

        /* Expanded state */
        const expandedHeaderHeight =
            mobile ? 220 : 250;

        const expandedLogoSize =
            mobile ? 145 : 180;

        const expandedLogoTop =
            mobile ? 12 : 16;

        /* Compact state */
        const compactHeaderHeight =
            mobile ? 68 : 76;

        const compactLogoSize =
            mobile ? 48 : 58;

        const compactLogoTop =
            (
                compactHeaderHeight -
                compactLogoSize
            ) / 2;

        /* Header height */
        const headerHeight = interpolate(
            expandedHeaderHeight,
            compactHeaderHeight,
            progress
        );

        /* Logo size and position */
        const logoSize = interpolate(
            expandedLogoSize,
            compactLogoSize,
            progress
        );

        const expandedLogoLeft =
            (
                containerWidth -
                expandedLogoSize
            ) / 2;

        const compactLogoLeft = 0;

        const logoLeft = interpolate(
            expandedLogoLeft,
            compactLogoLeft,
            progress
        );

        const logoTop = interpolate(
            expandedLogoTop,
            compactLogoTop,
            progress
        );

        /* Measure nav */
        const naturalNavWidth =
            links.scrollWidth;

        const navHeight =
            links.offsetHeight;

        const expandedNavTop =
            expandedLogoTop +
            expandedLogoSize +
            (mobile ? 14 : 18);

        const compactNavTop =
            (
                compactHeaderHeight -
                navHeight
            ) / 2;

        const navTop = interpolate(
            expandedNavTop,
            compactNavTop,
            progress
        );

        let navLeft;
        let navWidth;

        if (mobile) {
            const expandedNavWidth =
                Math.min(
                    naturalNavWidth,
                    containerWidth
                );

            const compactNavWidth =
                Math.max(
                    170,
                    containerWidth -
                    compactLogoSize -
                    24
                );

            navWidth = interpolate(
                expandedNavWidth,
                compactNavWidth,
                progress
            );

            const expandedNavLeft =
                (
                    containerWidth -
                    expandedNavWidth
                ) / 2;

            const compactNavLeft =
                compactLogoSize + 14;

            navLeft = interpolate(
                expandedNavLeft,
                compactNavLeft,
                progress
            );
        } else {
            navWidth = naturalNavWidth;

            const expandedNavLeft =
                (
                    containerWidth -
                    navWidth
                ) / 2;

            const compactNavLeft =
                Math.max(
                    containerWidth -
                    navWidth,
                    compactLogoSize + 28
                );

            navLeft = interpolate(
                expandedNavLeft,
                compactNavLeft,
                progress
            );
        }

        /* Apply values */
        header.style.setProperty(
            "--header-height",
            `${headerHeight}px`
        );

        header.style.setProperty(
            "--logo-size",
            `${logoSize}px`
        );

        header.style.setProperty(
            "--logo-left",
            `${logoLeft}px`
        );

        header.style.setProperty(
            "--logo-top",
            `${logoTop}px`
        );

        header.style.setProperty(
            "--nav-left",
            `${navLeft}px`
        );

        header.style.setProperty(
            "--nav-top",
            `${navTop}px`
        );

        header.style.setProperty(
            "--nav-width",
            mobile
                ? `${navWidth}px`
                : `${navWidth}px`
        );

        header.classList.toggle(
            "header-moving",
            progress > 0.03
        );
    }

    /*
    This creates gentle inertia so the movement
    feels smoother than a hard snap.
    */
    function animateHeader() {
        const distance =
            targetProgress -
            currentProgress;

        currentProgress +=
            distance * 0.14;

        if (Math.abs(distance) < 0.001) {
            currentProgress =
                targetProgress;

            renderHeader(currentProgress);
            animationFrame = null;
            return;
        }

        renderHeader(currentProgress);

        animationFrame =
            window.requestAnimationFrame(
                animateHeader
            );
    }

    function requestAnimation() {
        targetProgress =
            getTargetProgress();

        if (animationFrame !== null) {
            return;
        }

        animationFrame =
            window.requestAnimationFrame(
                animateHeader
            );
    }

    currentProgress =
        getTargetProgress();

    targetProgress =
        currentProgress;

    renderHeader(currentProgress);

    window.addEventListener(
        "scroll",
        requestAnimation,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        function () {
            currentProgress =
                getTargetProgress();

            targetProgress =
                currentProgress;

            renderHeader(currentProgress);
        }
    );

    window.setTimeout(function () {
        currentProgress =
            getTargetProgress();

        targetProgress =
            currentProgress;

        renderHeader(currentProgress);
    }, 100);
}
