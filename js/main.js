"use strict";

let summitDatabase = null;

document.addEventListener("DOMContentLoaded", function () {
    initializeSupabase();
    setCurrentYear();
    setMinimumDeliveryDate();
    setupOrderForm();
    setupCallbackForm();
});


/*
=================================
SUPABASE CONNECTION
=================================
*/

function initializeSupabase() {
    if (
        !window.supabase ||
        !window.SUMMIT_SUPABASE_URL ||
        !window.SUMMIT_SUPABASE_KEY
    ) {
        /* Public error details are intentionally hidden. */

        return;
    }

    summitDatabase = window.supabase.createClient(
        window.SUMMIT_SUPABASE_URL,
        window.SUMMIT_SUPABASE_KEY
    );

    console.log("Supabase connection initialized.");
}


/*
=================================
CURRENT YEAR
=================================
*/

function setCurrentYear() {
    const yearElements =
        document.querySelectorAll(".current-year");

    yearElements.forEach(function (element) {
        element.textContent = new Date().getFullYear();
    });
}


/*
=================================
MINIMUM DELIVERY DATE
=================================
*/

function setMinimumDeliveryDate() {
    const deliveryDateInput =
        document.getElementById("deliveryDate");

    if (!deliveryDateInput) {
        return;
    }

    const today = new Date();

    const year = today.getFullYear();

    const month = String(
        today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        today.getDate()
    ).padStart(2, "0");

    deliveryDateInput.min =
        `${year}-${month}-${day}`;
}


/*
=================================
ORDER FORM
=================================
*/

function setupOrderForm() {
    const orderForm =
        document.getElementById("orderForm");

    const orderMessage =
        document.getElementById("orderMessage");

    if (!orderForm || !orderMessage) {
        return;
    }

    orderForm.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            if (!summitDatabase) {
                showOrderMessage(
                    orderMessage,
                    "The ordering system is unavailable. Please refresh the page and try again.",
                    "error"
                );

                return;
            }

            const submitButton =
                orderForm.querySelector(
                    'button[type="submit"]'
                );

            const originalButtonText =
                submitButton.textContent;

            submitButton.disabled = true;
            submitButton.textContent =
                "Submitting Order...";

            showOrderMessage(
                orderMessage,
                "Submitting your order...",
                "loading"
            );

            const reference =
                createOrderReference();

            const orderData = {
                reference: reference,

                customer_name: document
                    .getElementById("customerName")
                    .value
                    .trim(),

                phone_number: document
                    .getElementById("phoneNumber")
                    .value
                    .trim(),

                email_address: document
                    .getElementById("emailAddress")
                    .value
                    .trim() || null,

                material_type: document
                    .getElementById("materialType")
                    .value,

                quantity: Number(
                    document
                        .getElementById("quantity")
                        .value
                ),

                measurement_unit: document
                    .getElementById("measurementUnit")
                    .value,

                delivery_location: document
                    .getElementById("deliveryLocation")
                    .value
                    .trim(),

                delivery_date: document
                    .getElementById("deliveryDate")
                    .value,

                project_type: document
                    .getElementById("projectType")
                    .value,

                order_notes: document
                    .getElementById("orderNotes")
                    .value
                    .trim() || null,

                status: "New"
            };

            try {
                const result = await summitDatabase
                    .from("orders")
                    .insert(orderData);

                if (result.error) {
                    throw new Error("PUBLIC_REQUEST_FAILED");
                }

                showOrderMessage(
                    orderMessage,
                    `Order submitted successfully. Your reference is ${reference}.`,
                    "success"
                );

                orderForm.reset();
                setMinimumDeliveryDate();

            } catch (error) {
                /* Public error details are intentionally hidden. */

                showOrderMessage(
                    orderMessage,
                    "Your order could not be submitted. Please check your internet connection and try again.",
                    "error"
                );

            } finally {
                submitButton.disabled = false;
                submitButton.textContent =
                    originalButtonText;
            }
        }
    );
}


/*
=================================
ORDER REFERENCE
=================================
*/

function createOrderReference() {
    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    const time =
        String(date.getHours())
            .padStart(2, "0") +
        String(date.getMinutes())
            .padStart(2, "0");

    const randomNumber =
        Math.floor(
            1000 + Math.random() * 9000
        );

    return (
        `SSS-${year}${month}${day}-` +
        `${time}-${randomNumber}`
    );
}


/*
=================================
ORDER RESPONSE MESSAGE
=================================
*/

function showOrderMessage(
    element,
    message,
    type
) {
    element.textContent = message;

    element.classList.remove(
        "success-message",
        "error-message",
        "loading-message"
    );

    if (type === "success") {
        element.classList.add(
            "success-message"
        );
    } else if (type === "error") {
        element.classList.add(
            "error-message"
        );
    } else {
        element.classList.add(
            "loading-message"
        );
    }
}


/*
=================================
CALLBACK FORM
=================================
*/

function setupCallbackForm() {
    const callbackForm =
        document.querySelector(".contact-form");

    if (!callbackForm) {
        return;
    }

    let responseMessage =
        callbackForm.querySelector(
            ".callback-message"
        );

    if (!responseMessage) {
        responseMessage =
            document.createElement("p");

        responseMessage.className =
            "callback-message";

        callbackForm.appendChild(
            responseMessage
        );
    }

    callbackForm.addEventListener(
        "submit",
        function (event) {
            event.preventDefault();

            const nameInput =
                callbackForm.querySelector("#name");

            if (!nameInput) {
                return;
            }

            const name =
                nameInput.value.trim();

            responseMessage.textContent =
                `Thank you, ${name}. Your callback request has been recorded.`;

            responseMessage.className =
                "callback-message success-message";

            callbackForm.reset();
        }
    );
}


/*
=================================
COMPACT STICKY HEADER
=================================
*/


