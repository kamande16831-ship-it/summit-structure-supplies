"use strict";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Summit@2026";

const ORDER_STORAGE_KEY = "summitOrders";
const ADMIN_SESSION_KEY = "summitAdminSession";

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("adminLoginForm");
    const logoutButton = document.getElementById("logoutButton");
    const refreshButton = document.getElementById("refreshOrdersButton");
    const exportButton = document.getElementById("exportOrdersButton");
    const searchInput = document.getElementById("orderSearch");
    const tableBody = document.getElementById("ordersTableBody");

    loginForm.addEventListener("submit", handleLogin);
    logoutButton.addEventListener("click", handleLogout);
    refreshButton.addEventListener("click", displayOrders);
    exportButton.addEventListener("click", exportOrders);
    searchInput.addEventListener("input", displayOrders);
    tableBody.addEventListener("change", changeOrderStatus);
    tableBody.addEventListener("click", deleteOrder);

    if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "true") {
        showDashboard();
    } else {
        showLogin();
    }
});


function handleLogin(event) {
    event.preventDefault();

    const username = document
        .getElementById("adminUsername")
        .value
        .trim();

    const password = document
        .getElementById("adminPassword")
        .value;

    const message =
        document.getElementById("adminLoginMessage");

    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");

        message.textContent = "";
        event.currentTarget.reset();

        showDashboard();
        return;
    }

    message.textContent = "Incorrect username or password.";
    message.className = "admin-login-message error-message";
}


function handleLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    showLogin();
}


function showLogin() {
    document
        .getElementById("adminLoginSection")
        .classList.remove("hidden");

    document
        .getElementById("adminDashboard")
        .classList.add("hidden");

    document
        .getElementById("logoutButton")
        .classList.add("hidden");
}


function showDashboard() {
    document
        .getElementById("adminLoginSection")
        .classList.add("hidden");

    document
        .getElementById("adminDashboard")
        .classList.remove("hidden");

    document
        .getElementById("logoutButton")
        .classList.remove("hidden");

    displayOrders();
}


function getOrders() {
    try {
        const orders = JSON.parse(
            localStorage.getItem(ORDER_STORAGE_KEY)
        );

        return Array.isArray(orders) ? orders : [];
    } catch (error) {
        console.error("Could not read orders:", error);
        return [];
    }
}


function saveOrders(orders) {
    localStorage.setItem(
        ORDER_STORAGE_KEY,
        JSON.stringify(orders)
    );
}


function displayOrders() {
    const tableBody =
        document.getElementById("ordersTableBody");

    const searchValue =
        document
            .getElementById("orderSearch")
            .value
            .trim()
            .toLowerCase();

    const emptyMessage =
        document.getElementById("adminEmptyMessage");

    const tableContainer =
        document.getElementById("adminTableContainer");

    const allOrders = getOrders()
        .map(function (order) {
            return {
                ...order,
                status: order.status || "New"
            };
        })
        .sort(function (firstOrder, secondOrder) {
            return (
                new Date(secondOrder.submittedAt) -
                new Date(firstOrder.submittedAt)
            );
        });

    updateOrderCounts(allOrders);

    const filteredOrders = allOrders.filter(function (order) {
        const searchableText = [
            order.reference,
            order.customerName,
            order.phoneNumber,
            order.emailAddress,
            order.materialType,
            order.deliveryLocation
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return searchableText.includes(searchValue);
    });

    tableBody.innerHTML = "";

    if (filteredOrders.length === 0) {
        emptyMessage.classList.remove("hidden");
        tableContainer.classList.add("hidden");
        return;
    }

    emptyMessage.classList.add("hidden");
    tableContainer.classList.remove("hidden");

    filteredOrders.forEach(function (order) {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>
                    ${escapeHtml(order.reference || "No reference")}
                </strong>
            </td>

            <td>
                <strong>
                    ${escapeHtml(order.customerName || "Unknown")}
                </strong>

                <span>
                    ${escapeHtml(order.phoneNumber || "No phone")}
                </span>

                <span>
                    ${escapeHtml(order.emailAddress || "No email")}
                </span>
            </td>

            <td>
                <strong>
                    ${escapeHtml(order.materialType || "Not specified")}
                </strong>

                <span>
                    ${escapeHtml(order.quantity || "-")}
                    ${escapeHtml(order.measurementUnit || "")}
                </span>

                <span>
                    ${escapeHtml(order.projectType || "")}
                </span>
            </td>

            <td>
                <strong>
                    ${escapeHtml(order.deliveryLocation || "Not provided")}
                </strong>

                <span>
                    ${formatDate(order.deliveryDate)}
                </span>
            </td>

            <td>
                ${formatDateTime(order.submittedAt)}
            </td>

            <td>
                <select
                    class="admin-status-select"
                    data-reference="${escapeHtml(order.reference || "")}"
                >
                    ${createStatusOptions(order.status)}
                </select>
            </td>

            <td>
                <button
                    type="button"
                    class="admin-delete-button"
                    data-reference="${escapeHtml(order.reference || "")}"
                >
                    Delete
                </button>
            </td>
        `;

        tableBody.appendChild(row);
    });
}


function createStatusOptions(currentStatus) {
    const statuses = [
        "New",
        "Processing",
        "Dispatched",
        "Completed",
        "Cancelled"
    ];

    return statuses
        .map(function (status) {
            const selected =
                status === currentStatus ? "selected" : "";

            return `
                <option value="${status}" ${selected}>
                    ${status}
                </option>
            `;
        })
        .join("");
}


function changeOrderStatus(event) {
    const select =
        event.target.closest(".admin-status-select");

    if (!select) {
        return;
    }

    const reference = select.dataset.reference;
    const orders = getOrders();

    const order = orders.find(function (savedOrder) {
        return savedOrder.reference === reference;
    });

    if (!order) {
        return;
    }

    order.status = select.value;
    saveOrders(orders);
    displayOrders();
}


function deleteOrder(event) {
    const button =
        event.target.closest(".admin-delete-button");

    if (!button) {
        return;
    }

    const reference = button.dataset.reference;

    const confirmed = window.confirm(
        `Delete order ${reference}?`
    );

    if (!confirmed) {
        return;
    }

    const remainingOrders = getOrders().filter(
        function (order) {
            return order.reference !== reference;
        }
    );

    saveOrders(remainingOrders);
    displayOrders();
}


function updateOrderCounts(orders) {
    document.getElementById("totalOrdersCount").textContent =
        orders.length;

    document.getElementById("newOrdersCount").textContent =
        countStatus(orders, "New");

    document.getElementById("processingOrdersCount").textContent =
        countStatus(orders, "Processing");

    document.getElementById("completedOrdersCount").textContent =
        countStatus(orders, "Completed");
}


function countStatus(orders, status) {
    return orders.filter(function (order) {
        return (order.status || "New") === status;
    }).length;
}


function exportOrders() {
    const orders = getOrders();

    if (orders.length === 0) {
        window.alert("There are no orders to export.");
        return;
    }

    const rows = [
        [
            "Reference",
            "Customer",
            "Phone",
            "Email",
            "Material",
            "Quantity",
            "Unit",
            "Location",
            "Delivery Date",
            "Project Type",
            "Status",
            "Submitted At"
        ]
    ];

    orders.forEach(function (order) {
        rows.push([
            order.reference,
            order.customerName,
            order.phoneNumber,
            order.emailAddress,
            order.materialType,
            order.quantity,
            order.measurementUnit,
            order.deliveryLocation,
            order.deliveryDate,
            order.projectType,
            order.status || "New",
            order.submittedAt
        ]);
    });

    const csv = rows
        .map(function (row) {
            return row
                .map(function (value) {
                    const safeValue =
                        value == null ? "" : String(value);

                    return `"${safeValue.replaceAll('"', '""')}"`;
                })
                .join(",");
        })
        .join("\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "summit-structure-orders.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


function formatDate(value) {
    if (!value) {
        return "Not provided";
    }

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString();
}


function formatDateTime(value) {
    if (!value) {
        return "Unknown";
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}


function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
