"use strict";

document.addEventListener("DOMContentLoaded", function () {
    setCurrentYear();
    setMinimumDeliveryDate();
    setupOrderForm();
    setupCallbackForm();
});


function setCurrentYear() {
    const yearElements = document.querySelectorAll(".current-year");

    yearElements.forEach(function (element) {
        element.textContent = new Date().getFullYear();
    });
}


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


function setupOrderForm() {
    const orderForm = document.getElementById("orderForm");
    const orderMessage = document.getElementById("orderMessage");

    if (!orderForm || !orderMessage) {
        return;
    }

    orderForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const orderData = {
            reference: createOrderReference(),

            customerName: document
                .getElementById("customerName")
                .value
                .trim(),

            phoneNumber: document
                .getElementById("phoneNumber")
                .value
                .trim(),

            emailAddress: document
                .getElementById("emailAddress")
                .value
                .trim(),

            materialType: document
                .getElementById("materialType")
                .value,

            quantity: document
                .getElementById("quantity")
                .value,

            measurementUnit: document
                .getElementById("measurementUnit")
                .value,

            deliveryLocation: document
                .getElementById("deliveryLocation")
                .value
                .trim(),

            deliveryDate: document
                .getElementById("deliveryDate")
                .value,

            projectType: document
                .getElementById("projectType")
                .value,

            orderNotes: document
                .getElementById("orderNotes")
                .value
                .trim(),

            submittedAt: new Date().toISOString()
        };

        saveOrder(orderData);

        orderMessage.textContent =
            `Order received successfully. Reference: ${orderData.reference}`;

        orderMessage.className =
            "order-message success-message";

        orderForm.reset();
        setMinimumDeliveryDate();
    });
}


function createOrderReference() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    return `SSS-${year}${month}${day}-${randomNumber}`;
}


function saveOrder(orderData) {
    const savedOrders =
        JSON.parse(localStorage.getItem("summitOrders")) || [];

    savedOrders.push(orderData);

    localStorage.setItem(
        "summitOrders",
        JSON.stringify(savedOrders)
    );
}


function setupCallbackForm() {
    const callbackForm = document.querySelector(".contact-form");

    if (!callbackForm) {
        return;
    }

    const responseMessage = document.createElement("p");

    responseMessage.className = "callback-message";

    callbackForm.appendChild(responseMessage);

    callbackForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const nameInput = callbackForm.querySelector("#name");

        if (!nameInput) {
            return;
        }

        const name = nameInput.value.trim();

        responseMessage.textContent =
            `Thank you, ${name}. Your callback request has been recorded.`;

        responseMessage.className =
            "callback-message success-message";

        callbackForm.reset();
    });
}