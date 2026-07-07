"use strict";

const ADMIN_UID =
    "6678535a-e4a1-4f6b-8f98-427d3cba3bd0";

let summitAdminDatabase = null;
let currentOrders = [];
let knownOrderIds = new Set();
let firstOrderLoad = true;
let refreshTimer = null;


/*
=================================
INITIALIZATION
=================================
*/

document.addEventListener(
    "DOMContentLoaded",
    async function () {
        initializeAdminDatabase();
        connectAdminEvents();
        await restoreAdminSession();
    }
);


function initializeAdminDatabase() {
    if (
        !window.supabase ||
        !window.SUMMIT_SUPABASE_URL ||
        !window.SUMMIT_SUPABASE_KEY
    ) {
        showLoginError(
            "The administrator system could not connect to Supabase."
        );

        return;
    }

    summitAdminDatabase =
        window.supabase.createClient(
            window.SUMMIT_SUPABASE_URL,
            window.SUMMIT_SUPABASE_KEY
        );
}


function connectAdminEvents() {
    document
        .getElementById("adminLoginForm")
        .addEventListener(
            "submit",
            handleAdminLogin
        );

    document
        .getElementById("logoutButton")
        .addEventListener(
            "click",
            handleAdminLogout
        );

    document
        .getElementById("refreshOrdersButton")
        .addEventListener(
            "click",
            loadOrders
        );

    document
        .getElementById("exportOrdersButton")
        .addEventListener(
            "click",
            exportOrders
        );

    document
        .getElementById("orderSearch")
        .addEventListener(
            "input",
            displayFilteredOrders
        );

    document
        .getElementById("ordersTableBody")
        .addEventListener(
            "change",
            handleStatusChange
        );

    document
        .getElementById("ordersTableBody")
        .addEventListener(
            "click",
            handleOrderDeletion
        );
}


/*
=================================
AUTHENTICATION
=================================
*/

async function restoreAdminSession() {
    if (!summitAdminDatabase) {
        showLogin();
        return;
    }

    const result =
        await summitAdminDatabase.auth.getSession();

    if (result.error) {
        console.error(
            "Session check failed:",
            result.error
        );

        showLogin();
        return;
    }

    const session = result.data.session;

    if (
        session &&
        session.user &&
        session.user.id === ADMIN_UID
    ) {
        await showDashboard();
        return;
    }

    if (session) {
        await summitAdminDatabase.auth.signOut();
    }

    showLogin();
}


async function handleAdminLogin(event) {
    event.preventDefault();

    const loginForm = event.currentTarget;

    if (!summitAdminDatabase) {
        showLoginError(
            "The database connection is unavailable."
        );

        return;
    }

    const email = document
        .getElementById("adminUsername")
        .value
        .trim();

    const password = document
        .getElementById("adminPassword")
        .value;

    const submitButton =
        loginForm.querySelector(
            'button[type="submit"]'
        );

    const originalText =
        submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Signing In...";

    clearLoginError();

    try {
        const result =
            await summitAdminDatabase.auth
                .signInWithPassword({
                    email: email,
                    password: password
                });

        if (result.error) {
            throw result.error;
        }

        if (
            !result.data.user ||
            result.data.user.id !== ADMIN_UID
        ) {
            await summitAdminDatabase.auth.signOut();

            throw new Error(
                "This account is not authorized to access the dashboard."
            );
        }

        loginForm.reset();

        await requestNotificationPermission();
        await showDashboard();

    } catch (error) {
        console.error(
            "Administrator login failed:",
            error
        );

        showLoginError(
            error.message ||
            "The email address or password is incorrect."
        );

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}


async function handleAdminLogout() {
    if (summitAdminDatabase) {
        await summitAdminDatabase.auth.signOut();
    }

    stopAutomaticRefresh();
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


async function showDashboard() {
    document
        .getElementById("adminLoginSection")
        .classList.add("hidden");

    document
        .getElementById("adminDashboard")
        .classList.remove("hidden");

    document
        .getElementById("logoutButton")
        .classList.remove("hidden");

    firstOrderLoad = true;
    knownOrderIds = new Set();

    await loadOrders();
    startAutomaticRefresh();
}


function showLoginError(message) {
    const element =
        document.getElementById(
            "adminLoginMessage"
        );

    if (!element) {
        return;
    }

    element.textContent = message;
    element.className =
        "admin-login-message error-message";
}


function clearLoginError() {
    const element =
        document.getElementById(
            "adminLoginMessage"
        );

    element.textContent = "";
    element.className =
        "admin-login-message";
}


/*
=================================
LOAD ORDERS
=================================
*/

async function loadOrders() {
    if (!summitAdminDatabase) {
        return;
    }

    const result = await summitAdminDatabase
        .from("orders")
        .select("*")
        .order(
            "submitted_at",
            { ascending: false }
        );

    if (result.error) {
        console.error(
            "Unable to load orders:",
            result.error
        );

        showOrderLoadingError(
            result.error.message
        );

        return;
    }

    const downloadedOrders =
        Array.isArray(result.data)
            ? result.data
            : [];

    notifyAboutNewOrders(downloadedOrders);

    currentOrders = downloadedOrders;

    updateOrderCounts(currentOrders);
    displayFilteredOrders();
}


function startAutomaticRefresh() {
    stopAutomaticRefresh();

    refreshTimer = window.setInterval(
        loadOrders,
        15000
    );
}


function stopAutomaticRefresh() {
    if (refreshTimer) {
        window.clearInterval(refreshTimer);
        refreshTimer = null;
    }
}


/*
=================================
NEW ORDER NOTIFICATIONS
=================================
*/

function notifyAboutNewOrders(orders) {
    const latestOrderIds =
        new Set(
            orders.map(function (order) {
                return order.id;
            })
        );

    if (firstOrderLoad) {
        knownOrderIds = latestOrderIds;
        firstOrderLoad = false;
        return;
    }

    const newOrders =
        orders.filter(function (order) {
            return !knownOrderIds.has(order.id);
        });

    knownOrderIds = latestOrderIds;

    if (newOrders.length === 0) {
        return;
    }

    document.title =
        `(${newOrders.length}) New Order - Summit Admin`;

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {
        const newestOrder = newOrders[0];

        new Notification(
            "New Summit Structure Supplies Order",
            {
                body:
                    `${newestOrder.customer_name} ordered ` +
                    `${newestOrder.quantity} ` +
                    `${newestOrder.measurement_unit} of ` +
                    `${newestOrder.material_type}.`
            }
        );
    }
}


async function requestNotificationPermission() {
    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {
        try {
            await Notification.requestPermission();
        } catch (error) {
            console.warn(
                "Notification permission was not granted:",
                error
            );
        }
    }
}


/*
=================================
DISPLAY ORDERS
=================================
*/

function displayFilteredOrders() {
    const searchValue = document
        .getElementById("orderSearch")
        .value
        .trim()
        .toLowerCase();

    const filteredOrders =
        currentOrders.filter(function (order) {
            const searchableText = [
                order.reference,
                order.customer_name,
                order.phone_number,
                order.email_address,
                order.material_type,
                order.delivery_location,
                order.project_type,
                order.status
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(
                searchValue
            );
        });

    renderOrders(filteredOrders);
}


function renderOrders(orders) {
    const tableBody =
        document.getElementById(
            "ordersTableBody"
        );

    const emptyMessage =
        document.getElementById(
            "adminEmptyMessage"
        );

    const tableContainer =
        document.getElementById(
            "adminTableContainer"
        );

    tableBody.innerHTML = "";

    if (orders.length === 0) {
        emptyMessage.classList.remove("hidden");
        tableContainer.classList.add("hidden");
        return;
    }

    emptyMessage.classList.add("hidden");
    tableContainer.classList.remove("hidden");

    orders.forEach(function (order) {
        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>
                    ${escapeHtml(order.reference)}
                </strong>
            </td>

            <td>
                <strong>
                    ${escapeHtml(order.customer_name)}
                </strong>

                <span>
                    ${escapeHtml(order.phone_number)}
                </span>

                <span>
                    ${escapeHtml(
                        order.email_address ||
                        "No email supplied"
                    )}
                </span>
            </td>

            <td>
                <strong>
                    ${escapeHtml(order.material_type)}
                </strong>

                <span>
                    ${escapeHtml(order.quantity)}
                    ${escapeHtml(order.measurement_unit)}
                </span>

                <span>
                    ${escapeHtml(order.project_type)}
                </span>

                ${
                    order.order_notes
                        ? `
                            <span>
                                ${escapeHtml(order.order_notes)}
                            </span>
                        `
                        : ""
                }
            </td>

            <td>
                <strong>
                    ${escapeHtml(
                        order.delivery_location
                    )}
                </strong>

                <span>
                    ${formatDate(
                        order.delivery_date
                    )}
                </span>
            </td>

            <td>
                ${formatDateTime(
                    order.submitted_at
                )}
            </td>

            <td>
                <select
                    class="admin-status-select"
                    data-order-id="${escapeHtml(order.id)}"
                >
                    ${createStatusOptions(
                        order.status
                    )}
                </select>
            </td>

            <td>
                <button
                    type="button"
                    class="admin-delete-button"
                    data-order-id="${escapeHtml(order.id)}"
                    data-reference="${escapeHtml(order.reference)}"
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
                status === currentStatus
                    ? "selected"
                    : "";

            return `
                <option
                    value="${status}"
                    ${selected}
                >
                    ${status}
                </option>
            `;
        })
        .join("");
}


/*
=================================
UPDATE ORDER STATUS
=================================
*/

async function handleStatusChange(event) {
    const select =
        event.target.closest(
            ".admin-status-select"
        );

    if (!select) {
        return;
    }

    const orderId =
        select.dataset.orderId;

    const newStatus =
        select.value;

    select.disabled = true;

    const result = await summitAdminDatabase
        .from("orders")
        .update({
            status: newStatus
        })
        .eq("id", orderId);

    select.disabled = false;

    if (result.error) {
        window.alert(
            `The status could not be updated: ${result.error.message}`
        );

        await loadOrders();
        return;
    }

    await loadOrders();
}


/*
=================================
DELETE ORDER
=================================
*/

async function handleOrderDeletion(event) {
    const button =
        event.target.closest(
            ".admin-delete-button"
        );

    if (!button) {
        return;
    }

    const orderId =
        button.dataset.orderId;

    const reference =
        button.dataset.reference;

    const confirmed =
        window.confirm(
            `Delete order ${reference}?`
        );

    if (!confirmed) {
        return;
    }

    button.disabled = true;
    button.textContent = "Deleting...";

    const result = await summitAdminDatabase
        .from("orders")
        .delete()
        .eq("id", orderId);

    if (result.error) {
        window.alert(
            `The order could not be deleted: ${result.error.message}`
        );

        button.disabled = false;
        button.textContent = "Delete";
        return;
    }

    await loadOrders();
}


/*
=================================
ORDER COUNTS
=================================
*/

function updateOrderCounts(orders) {
    document
        .getElementById("totalOrdersCount")
        .textContent = orders.length;

    document
        .getElementById("newOrdersCount")
        .textContent =
            countOrdersByStatus(
                orders,
                "New"
            );

    document
        .getElementById(
            "processingOrdersCount"
        )
        .textContent =
            countOrdersByStatus(
                orders,
                "Processing"
            );

    document
        .getElementById(
            "completedOrdersCount"
        )
        .textContent =
            countOrdersByStatus(
                orders,
                "Completed"
            );
}


function countOrdersByStatus(
    orders,
    status
) {
    return orders.filter(
        function (order) {
            return order.status === status;
        }
    ).length;
}


/*
=================================
EXPORT ORDERS
=================================
*/

function exportOrders() {
    if (currentOrders.length === 0) {
        window.alert(
            "There are no orders to export."
        );

        return;
    }

    const headings = [
        "Reference",
        "Customer Name",
        "Phone Number",
        "Email",
        "Material",
        "Quantity",
        "Unit",
        "Delivery Location",
        "Delivery Date",
        "Project Type",
        "Notes",
        "Status",
        "Submitted At"
    ];

    const rows =
        currentOrders.map(function (order) {
            return [
                order.reference,
                order.customer_name,
                order.phone_number,
                order.email_address,
                order.material_type,
                order.quantity,
                order.measurement_unit,
                order.delivery_location,
                order.delivery_date,
                order.project_type,
                order.order_notes,
                order.status,
                order.submitted_at
            ];
        });

    const csv = [
        headings,
        ...rows
    ]
        .map(function (row) {
            return row
                .map(csvValue)
                .join(",");
        })
        .join("\n");

    const blob = new Blob(
        [csv],
        {
            type:
                "text/csv;charset=utf-8;"
        }
    );

    const downloadUrl =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = downloadUrl;
    link.download =
        "summit-structure-orders.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(downloadUrl);
}


/*
=================================
HELPERS
=================================
*/

function showOrderLoadingError(message) {
    const emptyMessage =
        document.getElementById(
            "adminEmptyMessage"
        );

    const tableContainer =
        document.getElementById(
            "adminTableContainer"
        );

    emptyMessage.innerHTML = `
        <h3>Orders could not be loaded</h3>
        <p>${escapeHtml(message)}</p>
    `;

    emptyMessage.classList.remove("hidden");
    tableContainer.classList.add("hidden");
}


function csvValue(value) {
    const safeValue =
        value == null
            ? ""
            : String(value);

    return `"${safeValue.replaceAll(
        '"',
        '""'
    )}"`;
}


function formatDate(value) {
    if (!value) {
        return "Not provided";
    }

    const date =
        new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString();
}


function formatDateTime(value) {
    if (!value) {
        return "Unknown";
    }

    const date =
        new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}


function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
