"use strict";

document.addEventListener(
    "DOMContentLoaded",
    initializeScrollingHeader
);

function initializeScrollingHeader() {
    const header =
        document.querySelector(".site-header");

    const navigation =
        header?.querySelector(".navigation");

    const logoHolder =
        header?.querySelector(".centered-brand");

    const logo =
        header?.querySelector(".brand-logo-image");

    const links =
        header?.querySelector(".nav-links");

    if (
        !header ||
        !navigation ||
        !logoHolder ||
        !logo ||
        !links
    ) {
        return;
    }

    let frameRequested = false;

    function clamp(value, minimum, maximum) {
        return Math.min(
            Math.max(value, minimum),
            maximum
        );
    }

    function interpolate(start, end, progress) {
        return start + (end - start) * progress;
    }

    function smoothstep(progress) {
        return (
            progress *
            progress *
            (3 - 2 * progress)
        );
    }

    function updateHeader() {
        const mobile =
            window.innerWidth <= 760;

        /*
        The full transition occurs over this
        scroll distance.
        */
        const transitionDistance =
            mobile ? 240 : 340;

        const rawProgress = clamp(
            window.scrollY / transitionDistance,
            0,
            1
        );

        const progress =
            smoothstep(rawProgress);

        const containerWidth =
            navigation.clientWidth;


        /* Expanded header values */

        const expandedHeaderHeight =
            mobile ? 205 : 220;

        const expandedLogoSize =
            mobile ? 105 : 120;

        const expandedLogoTop =
            mobile ? 14 : 18;

        const expandedLogoCenter =
            containerWidth / 2;


        /* Compact header values */

        const compactHeaderHeight =
            mobile ? 68 : 76;

        const compactLogoSize =
            mobile ? 46 : 52;

        const compactLogoTop =
            (
                compactHeaderHeight -
                compactLogoSize
            ) / 2;

        const compactLogoCenter =
            compactLogoSize / 2;


        /* Header size */

        const headerHeight =
            interpolate(
                expandedHeaderHeight,
                compactHeaderHeight,
                progress
            );


        /* Logo movement */

        const logoSize =
            interpolate(
                expandedLogoSize,
                compactLogoSize,
                progress
            );

        const logoTop =
            interpolate(
                expandedLogoTop,
                compactLogoTop,
                progress
            );

        const logoCenter =
            interpolate(
                expandedLogoCenter,
                compactLogoCenter,
                progress
            );


        /* Navigation movement */

        const naturalLinksWidth =
            links.scrollWidth;

        const linksHeight =
            links.offsetHeight;

        const expandedLinksTop =
            expandedHeaderHeight -
            linksHeight -
            (mobile ? 12 : 16);

        const compactLinksTop =
            (
                compactHeaderHeight -
                linksHeight
            ) / 2;

        const linksTop =
            interpolate(
                expandedLinksTop,
                compactLinksTop,
                progress
            );

        const expandedLinksCenter =
            containerWidth / 2;

        let compactLinksCenter;
        let linksWidth;

        if (mobile) {
            linksWidth = Math.max(
                175,
                containerWidth -
                compactLogoSize -
                20
            );

            compactLinksCenter =
                compactLogoSize +
                14 +
                linksWidth / 2;
        } else {
            linksWidth =
                naturalLinksWidth;

            const compactLinksLeft =
                Math.max(
                    compactLogoSize + 30,
                    containerWidth -
                    naturalLinksWidth
                );

            compactLinksCenter =
                compactLinksLeft +
                naturalLinksWidth / 2;
        }

        const linksCenter =
            interpolate(
                expandedLinksCenter,
                compactLinksCenter,
                progress
            );


        /* Apply calculated values */

        header.style.setProperty(
            "--header-height",
            `${headerHeight}px`
        );

        header.style.setProperty(
            "--logo-size",
            `${logoSize}px`
        );

        header.style.setProperty(
            "--logo-top",
            `${logoTop}px`
        );

        header.style.setProperty(
            "--logo-center",
            `${logoCenter}px`
        );

        header.style.setProperty(
            "--navigation-top",
            `${linksTop}px`
        );

        header.style.setProperty(
            "--navigation-center",
            `${linksCenter}px`
        );

        header.style.setProperty(
            "--navigation-width",
            `${linksWidth}px`
        );

        header.classList.toggle(
            "header-compact",
            rawProgress >= 0.98
        );

        header.classList.toggle(
            "header-scrolling",
            rawProgress > 0.02
        );

        frameRequested = false;
    }

    function requestHeaderUpdate() {
        if (frameRequested) {
            return;
        }

        frameRequested = true;

        window.requestAnimationFrame(
            updateHeader
        );
    }

    updateHeader();

    window.addEventListener(
        "scroll",
        requestHeaderUpdate,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        requestHeaderUpdate
    );

    window.addEventListener(
        "pageshow",
        requestHeaderUpdate
    );
}
