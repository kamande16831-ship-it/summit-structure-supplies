"use strict";

/*
=================================
SUMMIT STRUCTURE SUPPLIES
MAIN JAVASCRIPT
=================================
*/

document.addEventListener("DOMContentLoaded", function () {
    setCurrentYear();
    setMinimumDeliveryDate();
    prepareOrderForm();
    prepareCallbackForm();
});


/*
=================================
CURRENT YEAR
=================================
*/

function setCurrentYear() {
    const yearElements = document.querySelectorAll(".current-year");

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
    const deliveryDateInput = document.getElementById("deliveryDate");

    if (!deliveryDateInput) {
        return;
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    deliveryDateInput.min = `${year}-${month}-${day}`;
}


/*
=================================
ORDER FORM
=================================
*/

function prepareOrderForm() {
    const orderForm = document.getElementById("orderForm");
    const orderMessage = document.getElementById("orderMessage");

    if (!orderForm || !orderMessage) {
        return;
    }

    orderForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const customerName =
            document.getElementById("customerName").value.trim();

        const phoneNumber =
            document.getElementById("phoneNumber").value.trim();

        const emailAddress =
            document.getElementById("emailAddress").value.trim();

        const materialType =
            document.getElementById("materialType").value;

        const quantity =
            document.getElementById("quantity").value;

        const measurementUnit =
            document.getElementById("measurementUnit").value;

        const deliveryLocation =
            document.getElementById("deliveryLocation").value.trim();

        const deliveryDate =
            document.getElementById("deliveryDate").value;

        const projectType =
            document.getElementById("projectType").value;

        const orderNotes =
            document.getElementById("orderNotes").value.trim();

        const confirmation =
            document.getElementById("orderConfirmation").checked;

        if (
            !customerName ||
            !phoneNumber ||
            !materialType ||
            !quantity ||
            !measurementUnit ||
            !deliveryLocation ||
            !deliveryDate ||
            !projectType ||
            !confirmation
        ) {
            showOrderMessage(
                orderMessage,
                "Please complete all required fields.",
                "error"
            );

            return;
        }

        const orderReference = createOrderReference();

        const orderData = {
            reference: orderReference,
            customerName: customerName,
            phoneNumber: phoneNumber,
            emailAddress: emailAddress,
            materialType: materialType,
            quantity: quantity,
            measurementUnit: measurementUnit,
            deliveryLocation: deliveryLocation,
            deliveryDate: deliveryDate,
            projectType: projectType,
            orderNotes: orderNotes,
            submittedAt: new Date().toISOString()
        };

        saveOrderLocally(orderData);

        showOrderMessage(
            orderMessage,
            `Thank you, ${customerName}. Your request has been recorded. Reference: ${orderReference}`,
            "success"
        );

        orderForm.reset();
        setMinimumDeliveryDate();
    });
}


/*
=================================
CREATE ORDER REFERENCE
=================================
*/

function createOrderReference() {
    const date = new Date();

    const year = date.getFullYear();

    const month =
        String(date.getMonth() + 1).padStart(2, "0");

    const day =
        String(date.getDate()).padStart(2, "0");

    const randomNumber =
        Math.floor(1000 + Math.random() * 9000);

    return `SSS-${year}${month}${day}-${randomNumber}`;
}


/*
=================================
SAVE ORDERS LOCALLY
=================================
*/

function saveOrderLocally(orderData) {
    const savedOrders =
        JSON.parse(localStorage.getItem("summitOrders")) || [];

    savedOrders.push(orderData);

    localStorage.setItem(
        "summitOrders",
        JSON.stringify(savedOrders)
    );
}


/*
=================================
ORDER MESSAGE
=================================
*/

function showOrderMessage(element, message, type) {
    element.textContent = message;

    element.classList.remove(
        "success-message",
        "error-message"
    );

    if (type === "success") {
        element.classList.add("success-message");
    } else {
        element.classList.add("error-message");
    }
}


/*
=================================
CALLBACK FORM
=================================
*/

function prepareCallbackForm() {
    const callbackForm =
        document.querySelector(".contact-form");

    if (!callbackForm) {
        return;
    }

    const callbackMessage =
        document.createElement("p");

    callbackMessage.className = "callback-message";

    callbackForm.appendChild(callbackMessage);

    callbackForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const nameInput =
            callbackForm.querySelector("#name");

        const phoneInput =
            callbackForm.querySelector("#phone");

        const materialInput =
            callbackForm.querySelector("#material");

        const locationInput =
            callbackForm.querySelector("#location");

        if (
            !nameInput ||
            !phoneInput ||
            !materialInput ||
            !locationInput
        ) {
            return;
        }

        const callbackRequest = {
            name: nameInput.value.trim(),
            phone: phoneInput.value.trim(),
            material: materialInput.value,
            location: locationInput.value.trim(),
            submittedAt: new Date().toISOString()
        };

        const savedRequests =
            JSON.parse(
                localStorage.getItem("summitCallbackRequests")
            ) || [];

        savedRequests.push(callbackRequest);

        localStorage.setItem(
            "summitCallbackRequests",
            JSON.stringify(savedRequests)
        );

        callbackMessage.textContent =
            `Thank you, ${callbackRequest.name}. Your callback request has been recorded.`;

        callbackMessage.classList.remove("error-message");
        callbackMessage.classList.add("success-message");

        callbackForm.reset();
    });
}
