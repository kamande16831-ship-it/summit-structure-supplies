"use strict";

const UNIFIED_ADMIN_UID =
    "6678535a-e4a1-4f6b-8f98-427d3cba3bd0";

let unifiedDatabase = null;
let unifiedOrders = [];
let unifiedMaterials = [];
let editingUnifiedMaterialId = null;
let unifiedPaymentSettings = null;
let pendingUnifiedMfaFactorId = null;
let pendingUnifiedMfaMode = null;


document.addEventListener(
    "DOMContentLoaded",
    initializeUnifiedAdmin
);


async function initializeUnifiedAdmin() {
    if (
        !window.supabase ||
        !window.SUMMIT_SUPABASE_URL ||
        !window.SUMMIT_SUPABASE_KEY
    ) {
        showLoginError(
            "The administrator portal could not connect to Supabase."
        );

        return;
    }

    unifiedDatabase =
        window.supabase.createClient(
            window.SUMMIT_SUPABASE_URL,
            window.SUMMIT_SUPABASE_KEY
        );

    connectUnifiedAdminEvents();
    await restoreUnifiedAdminSession();
}


function connectUnifiedAdminEvents() {
    document
        .getElementById("unifiedAdminLoginForm")
        .addEventListener(
            "submit",
            handleUnifiedLogin
        );

    document
        .getElementById("unifiedAdminLogout")
        .addEventListener(
            "click",
            handleUnifiedLogout
        );


    document
        .getElementById("unifiedMfaForm")
        .addEventListener(
            "submit",
            handleUnifiedMfaSubmit
        );

    document
        .getElementById("unifiedMfaCancel")
        .addEventListener(
            "click",
            handleUnifiedLogout
        );

    document
        .querySelectorAll("[data-admin-view]")
        .forEach(function (control) {
            control.addEventListener(
                "click",
                function () {
                    activateAdminView(
                        control.dataset.adminView
                    );
                }
            );
        });

    document
        .getElementById("refreshDashboardButton")
        .addEventListener(
            "click",
            loadUnifiedData
        );

    document
        .getElementById("refreshUnifiedOrders")
        .addEventListener(
            "click",
            loadUnifiedOrders
        );

    document
        .getElementById("exportUnifiedOrders")
        .addEventListener(
            "click",
            exportUnifiedOrders
        );

    document
        .getElementById("unifiedOrderSearch")
        .addEventListener(
            "input",
            displayFilteredUnifiedOrders
        );

    document
        .getElementById("unifiedOrdersTableBody")
        .addEventListener(
            "change",
            updateUnifiedOrderStatus
        );

    document
        .getElementById("unifiedOrdersTableBody")
        .addEventListener(
            "click",
            deleteUnifiedOrder
        );

    document
        .getElementById("unifiedMaterialForm")
        .addEventListener(
            "submit",
            saveUnifiedMaterial
        );

    document
        .getElementById("cancelUnifiedMaterialEdit")
        .addEventListener(
            "click",
            resetUnifiedMaterialForm
        );

    document
        .getElementById("refreshUnifiedMaterials")
        .addEventListener(
            "click",
            loadUnifiedMaterials
        );

    document
        .getElementById("unifiedMaterialSearch")
        .addEventListener(
            "input",
            displayFilteredUnifiedMaterials
        );

    document
        .getElementById("unifiedMaterialsTableBody")
        .addEventListener(
            "click",
            handleUnifiedMaterialAction
        );

    window.addEventListener(
        "hashchange",
        activateViewFromHash
    );

    document
        .getElementById("unifiedPaymentForm")
        .addEventListener(
            "submit",
            saveUnifiedPaymentSettings
        );

    document
        .getElementById("refreshUnifiedPayment")
        .addEventListener(
            "click",
            loadUnifiedPaymentSettings
        );


    document
        .getElementById("unifiedPaymentType")
        .addEventListener(
            "change",
            handlePaymentOptionChange
        );

    document
        .getElementById("unifiedPaymentForm")
        .addEventListener(
            "input",
            renderUnifiedPaymentPreview
        );

}


async function restoreUnifiedAdminSession() {
    const result =
        await unifiedDatabase.auth.getSession();

    const session =
        result.data?.session;

    if (
        session?.user?.id ===
        UNIFIED_ADMIN_UID
    ) {
        await continueUnifiedAdminSecurityCheck();
        return;
    }

    if (session) {
        await unifiedDatabase.auth.signOut();
    }

    showUnifiedLogin();
}


async function handleUnifiedLogin(event) {
    event.preventDefault();

    const loginForm =
        event.currentTarget;

    const email = document
        .getElementById("unifiedAdminEmail")
        .value
        .trim();

    const password = document
        .getElementById("unifiedAdminPassword")
        .value;

    const button =
        loginForm.querySelector(
            'button[type="submit"]'
        );

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent = "Signing In...";

    clearLoginError();

    try {
        const result =
            await unifiedDatabase.auth
                .signInWithPassword({
                    email: email,
                    password: password
                });

        if (result.error) {
            throw result.error;
        }

        if (
            result.data.user?.id !==
            UNIFIED_ADMIN_UID
        ) {
            await unifiedDatabase.auth.signOut();

            throw new Error(
                "This account is not authorized."
            );
        }

        loginForm.reset();
        await continueUnifiedAdminSecurityCheck();

    } catch (error) {
        showLoginError(
            error.message ||
            "Incorrect email address or password."
        );

    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


async function handleUnifiedLogout() {
    await unifiedDatabase.auth.signOut();
    showUnifiedLogin();
}


function showUnifiedLogin() {
    document
        .getElementById("unifiedAdminLoginSection")
        .classList.remove("hidden");

    document
        .getElementById("unifiedAdminApplication")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminMfaSection")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminMenu")
        .classList.add("hidden");
}


async function showUnifiedApplication() {
    document
        .getElementById("unifiedAdminLoginSection")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminMfaSection")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminApplication")
        .classList.remove("hidden");

    document
        .getElementById("unifiedAdminMenu")
        .classList.remove("hidden");

    await loadUnifiedData();
    activateViewFromHash();
}


function activateViewFromHash() {
    const requestedView =
        window.location.hash.replace("#", "");

    const validViews = [
        "dashboard",
        "orders",
        "materials",
        "payment"
    ];

    activateAdminView(
        validViews.includes(requestedView)
            ? requestedView
            : "dashboard"
    );
}


function activateAdminView(view) {
    document
        .querySelectorAll("[data-admin-panel]")
        .forEach(function (panel) {
            panel.classList.toggle(
                "hidden",
                panel.dataset.adminPanel !== view
            );
        });

    document
        .querySelectorAll(".admin-menu-button")
        .forEach(function (button) {
            button.classList.toggle(
                "active",
                button.dataset.adminView === view
            );
        });

    window.history.replaceState(
        null,
        "",
        `#${view}`
    );

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


async function loadUnifiedData() {
    await Promise.all([
        loadUnifiedOrders(),
        loadUnifiedMaterials(),
        loadUnifiedPaymentSettings()
    ]);

    renderUnifiedDashboard();
}



/* =====================================
   MULTI-FACTOR AUTHENTICATION
===================================== */

async function continueUnifiedAdminSecurityCheck() {
    try {
        const assurance =
            await unifiedDatabase.auth.mfa
                .getAuthenticatorAssuranceLevel();

        if (assurance.error) {
            throw assurance.error;
        }

        if (
            assurance.data?.currentLevel === "aal2"
        ) {
            await showUnifiedApplication();
            return;
        }

        const factors =
            await unifiedDatabase.auth.mfa
                .listFactors();

        if (factors.error) {
            throw factors.error;
        }

        const verifiedTotpFactors =
            factors.data?.totp?.filter(
                function (factor) {
                    return factor.status === "verified";
                }
            ) || [];

        if (verifiedTotpFactors.length > 0) {
            await startUnifiedMfaChallenge(
                verifiedTotpFactors[0]
            );

            return;
        }

        await startUnifiedMfaEnrollment();

    } catch (error) {
        await unifiedDatabase.auth.signOut();

        showUnifiedLogin();

        showLoginError(
            error.message ||
            "Multi-factor authentication could not be started."
        );
    }
}


function showUnifiedMfaSection() {
    document
        .getElementById("unifiedAdminLoginSection")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminApplication")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminMenu")
        .classList.add("hidden");

    document
        .getElementById("unifiedAdminMfaSection")
        .classList.remove("hidden");
}


async function startUnifiedMfaEnrollment() {
    showUnifiedMfaSection();

    pendingUnifiedMfaMode = "enroll";
    pendingUnifiedMfaFactorId = null;

    document.getElementById(
        "unifiedMfaTitle"
    ).textContent =
        "Set Up Authenticator App";

    document.getElementById(
        "unifiedMfaDescription"
    ).textContent =
        "Scan the QR code below, then enter the 6-digit code from your authenticator app.";

    document.getElementById(
        "unifiedMfaSubmit"
    ).textContent =
        "Enable MFA";

    clearUnifiedMfaMessage();

    const enrollment =
        await unifiedDatabase.auth.mfa.enroll({
            factorType: "totp",
            friendlyName: `Summit Admin ${new Date().toISOString()}`
        });

    if (enrollment.error) {
        showUnifiedMfaMessage(
            enrollment.error.message,
            true
        );

        return;
    }

    pendingUnifiedMfaFactorId =
        enrollment.data.id;

    const qrCode =
        enrollment.data.totp?.qr_code || "";

    const qrImage =
        document.getElementById(
            "unifiedMfaQrCode"
        );

    if (qrCode.trim().startsWith("<svg")) {
        qrImage.src =
            "data:image/svg+xml;charset=utf-8," +
            encodeURIComponent(qrCode);
    } else {
        qrImage.src = qrCode;
    }

    document.getElementById(
        "unifiedMfaSecret"
    ).textContent =
        enrollment.data.totp?.secret || "";

    document
        .getElementById("unifiedMfaSetupBox")
        .classList.remove("hidden");

    document
        .getElementById("unifiedMfaCode")
        .focus();
}


async function startUnifiedMfaChallenge(factor) {
    showUnifiedMfaSection();

    pendingUnifiedMfaMode = "challenge";
    pendingUnifiedMfaFactorId = factor.id;

    document.getElementById(
        "unifiedMfaTitle"
    ).textContent =
        "Verify Your Login";

    document.getElementById(
        "unifiedMfaDescription"
    ).textContent =
        "Enter the 6-digit code from your authenticator app.";

    document.getElementById(
        "unifiedMfaSubmit"
    ).textContent =
        "Verify Code";

    document
        .getElementById("unifiedMfaSetupBox")
        .classList.add("hidden");

    clearUnifiedMfaMessage();

    document
        .getElementById("unifiedMfaCode")
        .focus();
}


async function handleUnifiedMfaSubmit(event) {
    event.preventDefault();

    const codeInput =
        document.getElementById(
            "unifiedMfaCode"
        );

    const code =
        codeInput.value.trim();

    if (!/^[0-9]{6}$/.test(code)) {
        showUnifiedMfaMessage(
            "Enter the 6-digit authenticator code.",
            true
        );

        return;
    }

    if (!pendingUnifiedMfaFactorId) {
        showUnifiedMfaMessage(
            "No MFA factor is ready. Please log in again.",
            true
        );

        return;
    }

    const button =
        document.getElementById(
            "unifiedMfaSubmit"
        );

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent = "Checking Code...";

    clearUnifiedMfaMessage();

    try {
        const challenge =
            await unifiedDatabase.auth.mfa.challenge({
                factorId: pendingUnifiedMfaFactorId
            });

        if (challenge.error) {
            throw challenge.error;
        }

        const verification =
            await unifiedDatabase.auth.mfa.verify({
                factorId: pendingUnifiedMfaFactorId,
                challengeId: challenge.data.id,
                code: code
            });

        if (verification.error) {
            throw verification.error;
        }

        pendingUnifiedMfaFactorId = null;
        pendingUnifiedMfaMode = null;

        codeInput.value = "";

        await showUnifiedApplication();

    } catch (error) {
        showUnifiedMfaMessage(
            error.message ||
            "The MFA code could not be verified.",
            true
        );

    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}


function showUnifiedMfaMessage(
    message,
    isError
) {
    const element =
        document.getElementById(
            "unifiedMfaMessage"
        );

    element.textContent = message;

    element.className =
        isError
            ? "unified-admin-message error-message"
            : "unified-admin-message success-message";
}


function clearUnifiedMfaMessage() {
    const element =
        document.getElementById(
            "unifiedMfaMessage"
        );

    element.textContent = "";
    element.className =
        "unified-admin-message";
}



/* =====================================
   ORDERS
===================================== */

async function loadUnifiedOrders() {
    const result =
        await unifiedDatabase
            .from("orders")
            .select("*")
            .order("submitted_at", {
                ascending: false
            });

    if (result.error) {
        showOrdersMessage(
            `Orders could not be loaded: ${result.error.message}`
        );

        return;
    }

    unifiedOrders =
        Array.isArray(result.data)
            ? result.data
            : [];

    displayFilteredUnifiedOrders();
    renderUnifiedDashboard();
}


function displayFilteredUnifiedOrders() {
    const searchValue = document
        .getElementById("unifiedOrderSearch")
        .value
        .trim()
        .toLowerCase();

    const filteredOrders =
        unifiedOrders.filter(function (order) {
            const text = [
                order.reference,
                order.customer_name,
                order.phone_number,
                order.email_address,
                order.material_type,
                order.delivery_location,
                order.status
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(searchValue);
        });

    renderUnifiedOrders(filteredOrders);
}


function renderUnifiedOrders(orders) {
    const body =
        document.getElementById(
            "unifiedOrdersTableBody"
        );

    const wrapper =
        document.getElementById(
            "unifiedOrdersTableWrapper"
        );

    const message =
        document.getElementById(
            "unifiedOrdersMessage"
        );

    body.innerHTML = "";

    if (orders.length === 0) {
        wrapper.classList.add("hidden");
        message.classList.remove("hidden");
        message.textContent = "No orders found.";
        return;
    }

    wrapper.classList.remove("hidden");
    message.classList.add("hidden");

    orders.forEach(function (order) {
        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeAdminHtml(order.reference)}</strong>
            </td>

            <td>
                <strong>${escapeAdminHtml(order.customer_name)}</strong>
                <span>${escapeAdminHtml(order.phone_number)}</span>
                <span>${escapeAdminHtml(order.email_address || "No email")}</span>
            </td>

            <td>
                <strong>${escapeAdminHtml(order.material_type)}</strong>
                <span>${escapeAdminHtml(order.project_type)}</span>
            </td>

            <td>
                <strong>${escapeAdminHtml(order.delivery_location)}</strong>
                <span>${formatAdminDate(order.delivery_date)}</span>
            </td>

            <td>
                ${formatAdminDateTime(order.submitted_at)}
            </td>

            <td>
                <select
                    class="unified-order-status"
                    data-order-id="${escapeAdminHtml(order.id)}"
                >
                    ${createUnifiedStatusOptions(order.status)}
                </select>
            </td>

            <td>
                <button
                    type="button"
                    class="unified-delete-button"
                    data-order-id="${escapeAdminHtml(order.id)}"
                    data-reference="${escapeAdminHtml(order.reference)}"
                >
                    Delete
                </button>
            </td>
        `;

        body.appendChild(row);
    });
}


function createUnifiedStatusOptions(currentStatus) {
    return [
        "New",
        "Processing",
        "Dispatched",
        "Completed",
        "Cancelled"
    ]
        .map(function (status) {
            return `
                <option
                    value="${status}"
                    ${status === currentStatus ? "selected" : ""}
                >
                    ${status}
                </option>
            `;
        })
        .join("");
}


async function updateUnifiedOrderStatus(event) {
    const select =
        event.target.closest(
            ".unified-order-status"
        );

    if (!select) {
        return;
    }

    select.disabled = true;

    const result =
        await unifiedDatabase
            .from("orders")
            .update({
                status: select.value
            })
            .eq(
                "id",
                select.dataset.orderId
            );

    select.disabled = false;

    if (result.error) {
        window.alert(result.error.message);
    }

    await loadUnifiedOrders();
}


async function deleteUnifiedOrder(event) {
    const button =
        event.target.closest(
            ".unified-delete-button"
        );

    if (!button) {
        return;
    }

    if (
        !window.confirm(
            `Delete order ${button.dataset.reference}?`
        )
    ) {
        return;
    }

    const result =
        await unifiedDatabase
            .from("orders")
            .delete()
            .eq(
                "id",
                button.dataset.orderId
            );

    if (result.error) {
        window.alert(result.error.message);
        return;
    }

    await loadUnifiedOrders();
}


function exportUnifiedOrders() {
    if (unifiedOrders.length === 0) {
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
            "Status"
        ],

        ...unifiedOrders.map(function (order) {
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
                order.status
            ];
        })
    ];

    downloadUnifiedCsv(
        rows,
        "summit-orders.csv"
    );
}


/* =====================================
   MATERIALS
===================================== */

async function loadUnifiedMaterials() {
    const result =
        await unifiedDatabase
            .from("materials")
            .select("*")
            .order("material_name", {
                ascending: true
            })
            .order("material_type", {
                ascending: true
            });

    if (result.error) {
        showMaterialsMessage(
            `Materials could not be loaded: ${result.error.message}`
        );

        return;
    }

    unifiedMaterials =
        Array.isArray(result.data)
            ? result.data
            : [];

    displayFilteredUnifiedMaterials();
    renderUnifiedDashboard();
}


function displayFilteredUnifiedMaterials() {
    const searchValue = document
        .getElementById("unifiedMaterialSearch")
        .value
        .trim()
        .toLowerCase();

    const filteredMaterials =
        unifiedMaterials.filter(function (material) {
            const text = [
                material.material_name,
                material.material_type,
                material.availability_status,
                material.price_unit,
                material.description
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(searchValue);
        });

    renderUnifiedMaterials(filteredMaterials);
}


function renderUnifiedMaterials(materials) {
    const body =
        document.getElementById(
            "unifiedMaterialsTableBody"
        );

    const wrapper =
        document.getElementById(
            "unifiedMaterialsTableWrapper"
        );

    const message =
        document.getElementById(
            "unifiedMaterialsMessage"
        );

    body.innerHTML = "";

    if (materials.length === 0) {
        wrapper.classList.add("hidden");
        message.classList.remove("hidden");
        message.textContent =
            "No construction materials found.";
        return;
    }

    wrapper.classList.remove("hidden");
    message.classList.add("hidden");

    materials.forEach(function (material) {
        const row =
            document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeAdminHtml(material.material_name)}</strong>
            </td>

            <td>
                ${escapeAdminHtml(material.material_type)}
            </td>

            <td>
                <span class="
                    availability-badge
                    ${availabilityAdminClass(material.availability_status)}
                ">
                    ${escapeAdminHtml(material.availability_status)}
                </span>
            </td>

            <td>
                ${formatAdminCurrency(material.price)}
            </td>

            <td>
                ${escapeAdminHtml(material.price_unit)}
            </td>

            <td>
                ${material.is_active ? "Yes" : "No"}
            </td>

            <td>
                <div class="unified-material-actions">

                    <button
                        type="button"
                        class="unified-edit-button"
                        data-material-id="${material.id}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="unified-delete-button"
                        data-material-id="${material.id}"
                        data-material-name="${escapeAdminHtml(material.material_name)}"
                    >
                        Delete
                    </button>

                </div>
            </td>
        `;

        body.appendChild(row);
    });
}


async function saveUnifiedMaterial(event) {
    event.preventDefault();

    const button =
        document.getElementById(
            "saveUnifiedMaterial"
        );

    button.disabled = true;

    const materialData = {
        material_name: document
            .getElementById("unifiedMaterialName")
            .value
            .trim(),

        material_type: document
            .getElementById("unifiedMaterialType")
            .value
            .trim(),

        availability_status: document
            .getElementById("unifiedMaterialAvailability")
            .value,

        price: Number(
            document
                .getElementById("unifiedMaterialPrice")
                .value
        ),

        price_unit: document
            .getElementById("unifiedMaterialUnit")
            .value,

        description: document
            .getElementById("unifiedMaterialDescription")
            .value
            .trim() || null,

        is_active: document
            .getElementById("unifiedMaterialActive")
            .checked
    };

    let result;

    if (editingUnifiedMaterialId) {
        result =
            await unifiedDatabase
                .from("materials")
                .update(materialData)
                .eq(
                    "id",
                    editingUnifiedMaterialId
                );
    } else {
        result =
            await unifiedDatabase
                .from("materials")
                .insert(materialData);
    }

    button.disabled = false;

    if (result.error) {
        showUnifiedMaterialMessage(
            result.error.message,
            true
        );

        return;
    }

    showUnifiedMaterialMessage(
        editingUnifiedMaterialId
            ? "Material updated successfully."
            : "Material added successfully.",
        false
    );

    resetUnifiedMaterialForm();
    await loadUnifiedMaterials();
}


function handleUnifiedMaterialAction(event) {
    const editButton =
        event.target.closest(
            ".unified-edit-button"
        );

    const deleteButton =
        event.target.closest(
            ".unified-delete-button[data-material-id]"
        );

    if (editButton) {
        editUnifiedMaterial(
            editButton.dataset.materialId
        );
    }

    if (deleteButton) {
        deleteUnifiedMaterial(
            deleteButton.dataset.materialId,
            deleteButton.dataset.materialName
        );
    }
}


function editUnifiedMaterial(materialId) {
    const material =
        unifiedMaterials.find(function (item) {
            return item.id === materialId;
        });

    if (!material) {
        return;
    }

    editingUnifiedMaterialId = material.id;

    document.getElementById(
        "unifiedMaterialName"
    ).value = material.material_name;

    document.getElementById(
        "unifiedMaterialType"
    ).value = material.material_type;

    document.getElementById(
        "unifiedMaterialAvailability"
    ).value = material.availability_status;

    document.getElementById(
        "unifiedMaterialPrice"
    ).value = material.price;

    document.getElementById(
        "unifiedMaterialUnit"
    ).value = material.price_unit;

    document.getElementById(
        "unifiedMaterialDescription"
    ).value = material.description || "";

    document.getElementById(
        "unifiedMaterialActive"
    ).checked = material.is_active;

    document.getElementById(
        "unifiedMaterialFormTitle"
    ).textContent = "Edit Construction Material";

    document.getElementById(
        "saveUnifiedMaterial"
    ).textContent = "Update Material";

    document.getElementById(
        "cancelUnifiedMaterialEdit"
    ).classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function resetUnifiedMaterialForm() {
    editingUnifiedMaterialId = null;

    document
        .getElementById("unifiedMaterialForm")
        .reset();

    document.getElementById(
        "unifiedMaterialActive"
    ).checked = true;

    document.getElementById(
        "unifiedMaterialFormTitle"
    ).textContent = "Add Construction Material";

    document.getElementById(
        "saveUnifiedMaterial"
    ).textContent = "Save Material";

    document.getElementById(
        "cancelUnifiedMaterialEdit"
    ).classList.add("hidden");
}


async function deleteUnifiedMaterial(
    materialId,
    materialName
) {
    if (
        !window.confirm(
            `Delete ${materialName}?`
        )
    ) {
        return;
    }

    const result =
        await unifiedDatabase
            .from("materials")
            .delete()
            .eq("id", materialId);

    if (result.error) {
        window.alert(result.error.message);
        return;
    }

    await loadUnifiedMaterials();
}



/* =====================================
   PAYMENT METHOD
===================================== */


function handlePaymentOptionChange() {
    applyPaymentOptionLayout(true);
    renderUnifiedPaymentPreview();
}


function applyPaymentOptionLayout(clearUnusedValues) {
    const paymentType =
        document.getElementById(
            "unifiedPaymentType"
        ).value;

    const paymentNameInput =
        document.getElementById(
            "unifiedPaymentName"
        );

    const primaryLabelInput =
        document.getElementById(
            "unifiedPrimaryLabel"
        );

    const primaryValueInput =
        document.getElementById(
            "unifiedPrimaryValue"
        );

    const secondaryLabelInput =
        document.getElementById(
            "unifiedSecondaryLabel"
        );

    const secondaryValueInput =
        document.getElementById(
            "unifiedSecondaryValue"
        );

    const recipientInput =
        document.getElementById(
            "unifiedRecipientName"
        );

    const primaryLabelGroup =
        document.getElementById(
            "unifiedPrimaryLabelGroup"
        );

    const secondaryLabelGroup =
        document.getElementById(
            "unifiedSecondaryLabelGroup"
        );

    const secondaryValueGroup =
        document.getElementById(
            "unifiedSecondaryValueGroup"
        );

    const recipientGroup =
        document.getElementById(
            "unifiedRecipientGroup"
        );

    const primaryDisplayLabel =
        document.getElementById(
            "unifiedPrimaryValueDisplayLabel"
        );

    const secondaryDisplayLabel =
        document.getElementById(
            "unifiedSecondaryValueDisplayLabel"
        );

    const recipientDisplayLabel =
        document.getElementById(
            "unifiedRecipientDisplayLabel"
        );


    const configurations = {
        "Paybill": {
            paymentName: "M-PESA",
            primaryLabel: "Business Number",
            primaryPlaceholder: "Enter M-PESA Paybill number",
            secondaryLabel: "Account Number",
            secondaryPlaceholder: "Example: Use the order reference",
            recipientLabel: "Recipient or Business Name",
            showSecondary: true,
            showRecipient: true,
            customLabels: false
        },

        "Till Number": {
            paymentName: "M-PESA",
            primaryLabel: "Till Number",
            primaryPlaceholder: "Enter M-PESA Till Number",
            secondaryLabel: "",
            secondaryPlaceholder: "",
            recipientLabel: "Recipient or Business Name",
            showSecondary: false,
            showRecipient: true,
            customLabels: false
        },

        "Send Money": {
            paymentName: "M-PESA",
            primaryLabel: "M-PESA Phone Number",
            primaryPlaceholder: "Example: 0712 345 678",
            secondaryLabel: "",
            secondaryPlaceholder: "",
            recipientLabel: "Recipient Name",
            showSecondary: false,
            showRecipient: true,
            customLabels: false
        },

        "Bank Transfer": {
            paymentName: "Bank Transfer",
            primaryLabel: "Bank Name",
            primaryPlaceholder: "Enter the bank name",
            secondaryLabel: "Account Number",
            secondaryPlaceholder: "Enter the bank account number",
            recipientLabel: "Account Name",
            showSecondary: true,
            showRecipient: true,
            customLabels: false
        },

        "Other": {
            paymentName: "",
            primaryLabel: "Primary Field",
            primaryPlaceholder: "Enter the primary payment detail",
            secondaryLabel: "Secondary Field",
            secondaryPlaceholder: "Enter an optional secondary detail",
            recipientLabel: "Recipient or Business Name",
            showSecondary: true,
            showRecipient: true,
            customLabels: true
        }
    };


    const configuration =
        configurations[paymentType] ||
        configurations.Other;


    if (
        paymentType !== "Other" &&
        (
            !paymentNameInput.value.trim() ||
            paymentNameInput.value === "M-PESA" ||
            paymentNameInput.value === "Bank Transfer"
        )
    ) {
        paymentNameInput.value =
            configuration.paymentName;
    }


    /*
    Standard payment options use fixed labels.
    Custom label editing is only shown for "Other".
    */

    primaryLabelGroup.classList.toggle(
        "hidden",
        !configuration.customLabels
    );

    secondaryLabelGroup.classList.toggle(
        "hidden",
        !configuration.customLabels
    );


    if (!configuration.customLabels) {
        primaryLabelInput.value =
            configuration.primaryLabel;

        secondaryLabelInput.value =
            configuration.secondaryLabel;
    }


    primaryDisplayLabel.textContent =
        configuration.primaryLabel;

    primaryValueInput.placeholder =
        configuration.primaryPlaceholder;

    primaryValueInput.required = true;


    secondaryValueGroup.classList.toggle(
        "hidden",
        !configuration.showSecondary
    );

    secondaryValueInput.required =
        configuration.showSecondary;

    secondaryDisplayLabel.textContent =
        configuration.secondaryLabel ||
        "Secondary Payment Detail";

    secondaryValueInput.placeholder =
        configuration.secondaryPlaceholder;


    recipientGroup.classList.toggle(
        "hidden",
        !configuration.showRecipient
    );

    recipientInput.required =
        configuration.showRecipient;

    recipientDisplayLabel.textContent =
        configuration.recipientLabel;


    if (clearUnusedValues) {
        if (!configuration.showSecondary) {
            secondaryLabelInput.value = "";
            secondaryValueInput.value = "";
        }

        if (!configuration.showRecipient) {
            recipientInput.value = "";
        }
    }
}


async function loadUnifiedPaymentSettings() {
    const result =
        await unifiedDatabase
            .from("payment_settings")
            .select("*")
            .eq("id", 1)
            .limit(1);

    if (result.error) {
        showUnifiedPaymentMessage(
            `Payment information could not be loaded: ${result.error.message}`,
            true
        );

        return;
    }

    unifiedPaymentSettings =
        Array.isArray(result.data) &&
        result.data.length > 0
            ? result.data[0]
            : null;

    populateUnifiedPaymentForm();
}


function populateUnifiedPaymentForm() {
    if (!unifiedPaymentSettings) {
        return;
    }

    document.getElementById(
        "unifiedPaymentName"
    ).value =
        unifiedPaymentSettings.payment_name || "M-PESA";

    document.getElementById(
        "unifiedPaymentType"
    ).value =
        unifiedPaymentSettings.payment_type || "Paybill";

    document.getElementById(
        "unifiedPrimaryLabel"
    ).value =
        unifiedPaymentSettings.primary_label || "";

    document.getElementById(
        "unifiedPrimaryValue"
    ).value =
        unifiedPaymentSettings.primary_value || "";

    document.getElementById(
        "unifiedSecondaryLabel"
    ).value =
        unifiedPaymentSettings.secondary_label || "";

    document.getElementById(
        "unifiedSecondaryValue"
    ).value =
        unifiedPaymentSettings.secondary_value || "";

    document.getElementById(
        "unifiedRecipientName"
    ).value =
        unifiedPaymentSettings.recipient_name || "";

    document.getElementById(
        "unifiedPaymentInstructions"
    ).value =
        unifiedPaymentSettings.instructions || "";

    document.getElementById(
        "unifiedPaymentActive"
    ).checked =
        Boolean(unifiedPaymentSettings.is_active);

    applyPaymentOptionLayout(false);
    renderUnifiedPaymentPreview();
}


async function saveUnifiedPaymentSettings(event) {
    event.preventDefault();

    applyPaymentOptionLayout(false);

    const button =
        document.getElementById(
            "saveUnifiedPayment"
        );

    const originalText =
        button.textContent;

    button.disabled = true;
    button.textContent =
        "Saving Payment Method...";

    const paymentData = {
        id: 1,

        payment_name: document
            .getElementById("unifiedPaymentName")
            .value
            .trim(),

        payment_type: document
            .getElementById("unifiedPaymentType")
            .value,

        primary_label: document
            .getElementById("unifiedPrimaryLabel")
            .value
            .trim(),

        primary_value: document
            .getElementById("unifiedPrimaryValue")
            .value
            .trim(),

        secondary_label: document
            .getElementById("unifiedSecondaryLabel")
            .value
            .trim() || null,

        secondary_value: document
            .getElementById("unifiedSecondaryValue")
            .value
            .trim() || null,

        recipient_name: document
            .getElementById("unifiedRecipientName")
            .value
            .trim() || null,

        instructions: document
            .getElementById("unifiedPaymentInstructions")
            .value
            .trim() || null,

        is_active: document
            .getElementById("unifiedPaymentActive")
            .checked
    };

    const result =
        await unifiedDatabase
            .from("payment_settings")
            .upsert(
                paymentData,
                {
                    onConflict: "id"
                }
            );

    button.disabled = false;
    button.textContent = originalText;

    if (result.error) {
        showUnifiedPaymentMessage(
            `Payment details could not be saved: ${result.error.message}`,
            true
        );

        return;
    }

    showUnifiedPaymentMessage(
        "Payment method saved successfully.",
        false
    );

    await loadUnifiedPaymentSettings();
}


function renderUnifiedPaymentPreview() {
    const preview =
        document.getElementById(
            "adminPaymentPreview"
        );

    if (!preview) {
        return;
    }

    const paymentName =
        document.getElementById(
            "unifiedPaymentName"
        ).value.trim() || "M-PESA";

    const paymentType =
        document.getElementById(
            "unifiedPaymentType"
        ).value;

    const primaryLabel =
        document.getElementById(
            "unifiedPrimaryLabel"
        ).value.trim();

    const primaryValue =
        document.getElementById(
            "unifiedPrimaryValue"
        ).value.trim();

    const secondaryLabel =
        document.getElementById(
            "unifiedSecondaryLabel"
        ).value.trim();

    const secondaryValue =
        document.getElementById(
            "unifiedSecondaryValue"
        ).value.trim();

    const recipientName =
        document.getElementById(
            "unifiedRecipientName"
        ).value.trim();

    const instructions =
        document.getElementById(
            "unifiedPaymentInstructions"
        ).value.trim();

    const active =
        document.getElementById(
            "unifiedPaymentActive"
        ).checked;

    preview.innerHTML = `
        <span class="payment-status-preview">
            ${active ? "Visible to customers" : "Hidden from customers"}
        </span>

        <h3>
            ${escapeAdminHtml(paymentName)}
        </h3>

        <p class="payment-option-preview">
            ${escapeAdminHtml(paymentType)}
        </p>

        <dl>
            <div>
                <dt>${escapeAdminHtml(primaryLabel)}</dt>
                <dd>${escapeAdminHtml(primaryValue || "Not entered")}</dd>
            </div>

            ${
                secondaryLabel || secondaryValue
                    ? `
                        <div>
                            <dt>${escapeAdminHtml(secondaryLabel)}</dt>
                            <dd>${escapeAdminHtml(secondaryValue)}</dd>
                        </div>
                    `
                    : ""
            }

            ${
                recipientName
                    ? `
                        <div>
                            <dt>Recipient</dt>
                            <dd>${escapeAdminHtml(recipientName)}</dd>
                        </div>
                    `
                    : ""
            }
        </dl>

        ${
            instructions
                ? `
                    <p class="payment-instructions-preview">
                        ${escapeAdminHtml(instructions)}
                    </p>
                `
                : ""
        }
    `;
}


function showUnifiedPaymentMessage(
    message,
    isError
) {
    const element =
        document.getElementById(
            "unifiedPaymentMessage"
        );

    element.textContent = message;

    element.className =
        isError
            ? "unified-admin-message error-message"
            : "unified-admin-message success-message";
}


/* =====================================
   DASHBOARD
===================================== */

function renderUnifiedDashboard() {
    setDashboardValue(
        "dashboardTotalOrders",
        unifiedOrders.length
    );

    setDashboardValue(
        "dashboardNewOrders",
        countUnifiedOrderStatus("New")
    );

    setDashboardValue(
        "dashboardProcessingOrders",
        countUnifiedOrderStatus("Processing")
    );

    setDashboardValue(
        "dashboardCompletedOrders",
        countUnifiedOrderStatus("Completed")
    );

    setDashboardValue(
        "dashboardTotalMaterials",
        unifiedMaterials.length
    );

    setDashboardValue(
        "dashboardActiveMaterials",
        unifiedMaterials.filter(
            function (material) {
                return material.is_active;
            }
        ).length
    );

    const body =
        document.getElementById(
            "dashboardRecentOrders"
        );

    body.innerHTML = "";

    unifiedOrders
        .slice(0, 5)
        .forEach(function (order) {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${escapeAdminHtml(order.reference)}</td>
                <td>${escapeAdminHtml(order.customer_name)}</td>
                <td>${escapeAdminHtml(order.material_type)}</td>
                <td>
                    ${escapeAdminHtml(order.quantity)}
                    ${escapeAdminHtml(order.measurement_unit)}
                </td>
                <td>${escapeAdminHtml(order.status)}</td>
            `;

            body.appendChild(row);
        });
}


function countUnifiedOrderStatus(status) {
    return unifiedOrders.filter(
        function (order) {
            return order.status === status;
        }
    ).length;
}


function setDashboardValue(id, value) {
    document.getElementById(id).textContent =
        value;
}


/* =====================================
   HELPERS
===================================== */

function showLoginError(message) {
    const element =
        document.getElementById(
            "unifiedAdminLoginMessage"
        );

    element.textContent = message;
    element.className =
        "unified-admin-message error-message";
}


function clearLoginError() {
    const element =
        document.getElementById(
            "unifiedAdminLoginMessage"
        );

    element.textContent = "";
    element.className =
        "unified-admin-message";
}


function showOrdersMessage(message) {
    const element =
        document.getElementById(
            "unifiedOrdersMessage"
        );

    element.textContent = message;
    element.classList.remove("hidden");
}


function showMaterialsMessage(message) {
    const element =
        document.getElementById(
            "unifiedMaterialsMessage"
        );

    element.textContent = message;
    element.classList.remove("hidden");
}


function showUnifiedMaterialMessage(
    message,
    isError
) {
    const element =
        document.getElementById(
            "unifiedMaterialFormMessage"
        );

    element.textContent = message;

    element.className =
        isError
            ? "unified-admin-message error-message"
            : "unified-admin-message success-message";
}


function availabilityAdminClass(status) {
    return String(status)
        .toLowerCase()
        .replaceAll(" ", "-");
}


function formatAdminCurrency(value) {
    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES"
        }
    ).format(Number(value));
}


function formatAdminDate(value) {
    if (!value) {
        return "Not provided";
    }

    return new Date(
        `${value}T00:00:00`
    ).toLocaleDateString();
}


function formatAdminDateTime(value) {
    return value
        ? new Date(value).toLocaleString()
        : "Unknown";
}


function downloadUnifiedCsv(rows, filename) {
    const csv = rows
        .map(function (row) {
            return row
                .map(function (value) {
                    return `"${String(value ?? "")
                        .replaceAll('"', '""')}"`;
                })
                .join(",");
        })
        .join("\n");

    const url =
        URL.createObjectURL(
            new Blob(
                [csv],
                {
                    type: "text/csv;charset=utf-8;"
                }
            )
        );

    const link =
        document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


function escapeAdminHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
