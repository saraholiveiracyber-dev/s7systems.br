"use strict";

/* =========================================================
   S7 SYSTEMS — JAVASCRIPT PRINCIPAL
   Mobile-first • Performance • Acessibilidade
   Compatível com o HTML da página de criação de e-book
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    /* =====================================================
       1. CONFIGURAÇÕES
    ===================================================== */

    const CHECKOUT_URLS = {
        Essencial: "https://pay.kiwify.com.br/ydusq7T",
        Profissional: "https://pay.kiwify.com.br/d9iboGd",
        Premium: "https://pay.kiwify.com.br/gTLzyXi"
    };

    const PLAN_PRICES = {
        Essencial: 197,
        Profissional: 397,
        Premium: 697
    };

    const MIN_DESCRIPTION_LENGTH = 500;
    const MAX_DESCRIPTION_LENGTH = 5000;

    const API_URL = "/api/ebook-pedidos";
    const API_TIMEOUT = 20000;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const isMobile = window.matchMedia(
        "(max-width: 768px)"
    ).matches;

    let selectedPlan = "";
    let isSubmitting = false;
    let headerScrollScheduled = false;

    /* =====================================================
       2. SELETORES
    ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const header = $("#header");
    const particleContainer = $("#money-particles");
    const cursorGlow = $(".cursor-glow");

    const form = $("#ebookOrderForm");

    const planInput = $("#plano");
    const valueInput = $("#valor");

    const selectedPlanName = $("#selectedPlanName");
    const selectedPlanPrice = $("#selectedPlanPrice");

    const nomeInput = $("#nome");
    const emailInput = $("#email");
    const whatsappInput = $("#whatsapp");
    const temaInput = $("#tema");
    const descricaoInput = $("#descricao");
    const publicoInput = $("#publico");
    const objetivoInput = $("#objetivo");
    const termsInput = $("#terms");

    const counter = $("#counter");
    const characterStatus = $("#characterStatus");

    const paymentButton = $("#paymentButton");
    const buttonText = $(".button-text", paymentButton || document);
    const formMessage = $("#formMessage");

    const planCards = $$(".plan-card");
    const planButtons = $$("[data-select-plan]");

    const errorElements = {
        nome: $("#nomeError"),
        email: $("#emailError"),
        whatsapp: $("#whatsappError"),
        tema: $("#temaError"),
        descricao: $("#descricaoError")
    };

    /* =====================================================
       3. AJUSTES GERAIS
    ===================================================== */

    document.documentElement.classList.add("js");

    document.documentElement.style.webkitTextSizeAdjust = "100%";

    if (reduceMotion || isMobile) {
        document.documentElement.style.scrollBehavior = "auto";
    }

    /*
      O CSS continua responsável pelo visual.
      Estas regras são apenas reforços para dispositivos móveis.
    */

    const responsiveStyle = document.createElement("style");

    responsiveStyle.textContent = `
        a, button, input, select, textarea {
            -webkit-tap-highlight-color: transparent;
        }

        button, a {
            touch-action: manipulation;
        }

        input, select, textarea {
            max-width: 100%;
        }

        #ebookOrderForm input,
        #ebookOrderForm select,
        #ebookOrderForm textarea {
            font-size: 16px;
        }

        #paymentButton {
            touch-action: manipulation;
        }

        #paymentButton:disabled {
            cursor: not-allowed;
            opacity: .65;
        }

        .meeting-loading {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            gap: 9px;
            pointer-events: none;
        }

        .meeting-loading-spinner {
            width: 15px;
            height: 15px;
            flex: 0 0 15px;
            border: 2px solid currentColor;
            border-right-color: transparent;
            border-radius: 50%;
            animation: s7-spin .7s linear infinite;
        }

        @keyframes s7-spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .cursor-glow {
                display: none !important;
            }

            #projeto,
            #ebookOrderForm,
            #planos,
            .plan-card {
                scroll-margin-top: 18px;
            }

            #paymentButton {
                width: 100%;
                min-height: 48px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
                scroll-behavior: auto !important;
                animation-duration: .01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: .01ms !important;
            }
        }
    `;

    document.head.appendChild(responsiveStyle);

    /* =====================================================
       4. FUNÇÕES UTILITÁRIAS
    ===================================================== */

    function getFieldValue(input) {
        return input?.value?.trim() || "";
    }

    function getPhoneDigits() {
        return (whatsappInput?.value || "").replace(/\D/g, "");
    }

    function formatPrice(value) {
        return Number(value).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function scrollToElement(element) {
        if (!element) return;

        element.scrollIntoView({
            behavior: reduceMotion || isMobile ? "auto" : "smooth",
            block: "start"
        });
    }

    function getReadableError(value) {
        if (typeof value === "string" && value.trim()) {
            return value;
        }

        if (value instanceof Error && value.message) {
            return value.message;
        }

        if (value && typeof value === "object") {
            for (const key of [
                "mensagem",
                "message",
                "error_description",
                "details",
                "error"
            ]) {
                const item = value[key];

                if (typeof item === "string" && item.trim()) {
                    return item;
                }

                if (item && typeof item === "object") {
                    const nested = getReadableError(item);

                    if (nested !== "Ocorreu um erro inesperado.") {
                        return nested;
                    }
                }
            }

            if (typeof value.code === "string") {
                return `Código do erro: ${value.code}`;
            }
        }

        return "Ocorreu um erro inesperado.";
    }

    function showMessage(message = "", type = "") {
        if (!formMessage) return;

        formMessage.textContent =
            typeof message === "string"
                ? message
                : getReadableError(message);

        formMessage.className = "form-message";

        if (type) {
            formMessage.classList.add(type);
        }

        if (message) {
            formMessage.setAttribute(
                "role",
                type === "error" ? "alert" : "status"
            );

            formMessage.setAttribute("aria-live", "polite");
        } else {
            formMessage.removeAttribute("role");
            formMessage.removeAttribute("aria-live");
        }
    }

    function setFieldError(input, errorElement, message = "") {
        if (errorElement) {
            errorElement.textContent = message;
        }

        if (input) {
            input.setAttribute(
                "aria-invalid",
                message ? "true" : "false"
            );
        }
    }

    /* =====================================================
       5. ANO AUTOMÁTICO DO RODAPÉ
    ===================================================== */

    const currentYear = $("#current-year");

    if (currentYear) {
        currentYear.textContent = String(new Date().getFullYear());
    }

    /* =====================================================
       6. CABEÇALHO AO ROLAR A PÁGINA
    ===================================================== */

    function updateHeader() {
        if (!header) return;

        header.classList.toggle("scrolled", window.scrollY > 20);
        headerScrollScheduled = false;
    }

    window.addEventListener("scroll", () => {
        if (headerScrollScheduled) return;

        headerScrollScheduled = true;
        window.requestAnimationFrame(updateHeader);
    }, { passive: true });

    updateHeader();

    /* =====================================================
       7. ANIMAÇÕES DE ENTRADA
    ===================================================== */

    const revealElements = $$(".reveal");

    if ("IntersectionObserver" in window && !reduceMotion) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: isMobile ? 0.03 : 0.1,
                rootMargin: "0px 0px 30px 0px"
            }
        );

        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });
    } else {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });
    }

    /* =====================================================
       8. IMAGENS
       Não modifica a imagem do celular ou seu conteúdo.
    ===================================================== */

    const aboutPhoto = $(".about-photo");

    aboutPhoto?.addEventListener("error", () => {
        console.warn("Não foi possível carregar a foto de apresentação.");
    });

    const phoneImage = $(".vendas-kiwify-img");

    phoneImage?.addEventListener("error", () => {
        console.warn(
            "Não foi possível carregar img/vendas-kiwify.png. Confira o caminho da imagem."
        );
    });

    /* =====================================================
       9. PARTÍCULAS DECORATIVAS
       Desativadas em celulares para priorizar desempenho.
    ===================================================== */

    function createMoneyParticles() {
        if (!particleContainer || reduceMotion || isMobile) return;
        if (particleContainer.childElementCount > 0) return;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < 10; i++) {
            const particle = document.createElement("span");

            particle.className = "money-particle";
            particle.textContent = Math.random() > 0.5 ? "$" : "✦";
            particle.setAttribute("aria-hidden", "true");

            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDuration =
                `${18 + Math.random() * 18}s`;
            particle.style.animationDelay =
                `${-Math.random() * 25}s`;
            particle.style.fontSize =
                `${13 + Math.random() * 10}px`;
            particle.style.opacity =
                `${0.12 + Math.random() * 0.2}`;

            fragment.appendChild(particle);
        }

        particleContainer.appendChild(fragment);
    }

    createMoneyParticles();

    /* =====================================================
       10. EFEITO DE CURSOR — DESKTOP
    ===================================================== */

    const hasFinePointer = window.matchMedia(
        "(pointer: fine)"
    ).matches;

    if (cursorGlow && hasFinePointer && !reduceMotion) {
        let frame = 0;
        let x = 0;
        let y = 0;

        document.body.classList.add("has-pointer");

        window.addEventListener("pointermove", (event) => {
            x = event.clientX;
            y = event.clientY;

            if (frame) return;

            frame = requestAnimationFrame(() => {
                cursorGlow.style.left = `${x}px`;
                cursorGlow.style.top = `${y}px`;
                frame = 0;
            });
        }, { passive: true });
    }

    /* =====================================================
       11. LINKS DE REUNIÃO ONLINE
       A navegação acontece imediatamente, sem fetch ou espera.
    ===================================================== */

    $$('a[href]').forEach((link) => {
        const href = link.getAttribute("href") || "";
        const label = (
            link.innerText ||
            link.getAttribute("aria-label") ||
            ""
        ).trim().toLowerCase();

        const isMeetingLink =
            /reuni[aã]o|mentoria|agendamento/.test(label) ||
            /agendar-reuniao\.html(?:[?#].*)?$/i.test(href) ||
            /forms\.office\.com|forms\.microsoft\.com/i.test(href);

        if (!isMeetingLink) return;

        link.addEventListener("click", () => {
            /*
              Não usar preventDefault().
              O navegador abre o destino normalmente.
            */

            if (link.dataset.meetingLoading === "true") return;

            link.dataset.meetingLoading = "true";
            link.classList.add("meeting-loading");
            link.setAttribute("aria-busy", "true");

            /*
              Mantém o conteúdo original do botão.
              Assim, não prejudica links com ícones ou elementos internos.
            */

            window.setTimeout(() => {
                if (!document.body.contains(link)) return;

                link.classList.remove("meeting-loading");
                link.removeAttribute("aria-busy");
                delete link.dataset.meetingLoading;
            }, 5000);
        }, { passive: true });
    });

    /* =====================================================
       12. SELEÇÃO DOS PLANOS
    ===================================================== */

    function selectPlan(planName, shouldScroll = false) {
        if (!Object.prototype.hasOwnProperty.call(
            PLAN_PRICES,
            planName
        )) {
            showMessage("Selecione um plano válido.", "error");
            return;
        }

        selectedPlan = planName;

        const price = PLAN_PRICES[planName];

        if (planInput) {
            planInput.value = planName;
        }

        if (valueInput) {
            valueInput.value = String(price);
        }

        if (selectedPlanName) {
            selectedPlanName.textContent = `E-book ${planName}`;
        }

        if (selectedPlanPrice) {
            selectedPlanPrice.textContent = `R$ ${formatPrice(price)}`;
        }

        planCards.forEach((card) => {
            const selected = card.dataset.plan === planName;

            card.classList.toggle("is-selected", selected);

            const button = $("[data-select-plan]", card);

            if (button) {
                button.classList.toggle("is-selected", selected);
                button.setAttribute("aria-pressed", String(selected));
            }
        });

        showMessage();
        updateFormState();

        if (shouldScroll) {
            scrollToElement($("#projeto"));

            /*
              O foco não é forçado no celular.
              Isso evita abrir o teclado sem necessidade.
            */
        }
    }

    planButtons.forEach((button) => {
        button.addEventListener("click", (event) => {
            event.preventDefault();

            selectPlan(button.dataset.selectPlan, true);
        });
    });

    /*
      Compatibilidade com botões adicionais de criação.
    */

    const createEbookSelectors = [
        "[data-create-ebook]",
        ".btn-criar-ebook",
        "#createEbookButton"
    ].join(",");

    $$(createEbookSelectors).forEach((button) => {
        button.addEventListener("click", (event) => {
            const target = $("#projeto");

            if (!target) return;

            event.preventDefault();

            if (!selectedPlan && planCards.length) {
                showMessage(
                    "Escolha um plano para iniciar seu projeto.",
                    "info"
                );
            }

            scrollToElement(target);
        });
    });

    /*
      Se o HTML já trouxer um plano preenchido, restaura a seleção.
    */

    const initialPlan = planInput?.value?.trim();

    if (
        initialPlan &&
        Object.prototype.hasOwnProperty.call(PLAN_PRICES, initialPlan)
    ) {
        selectPlan(initialPlan, false);
    }

    /* =====================================================
       13. VALIDAÇÃO DOS CAMPOS
    ===================================================== */

    function validateName() {
        const value = getFieldValue(nomeInput);
        let message = "";

        if (value.length < 2) {
            message = "Informe seu nome completo ou nome de contato.";
        } else if (value.length > 150) {
            message = "O nome deve ter até 150 caracteres.";
        }

        setFieldError(nomeInput, errorElements.nome, message);

        return !message;
    }

    function validateEmail() {
        const value = getFieldValue(emailInput);

        const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        const message = valid
            ? ""
            : "Informe um endereço de e-mail válido.";

        setFieldError(emailInput, errorElements.email, message);

        return !message;
    }

    function validatePhone() {
        const digits = getPhoneDigits();

        const message =
            digits.length < 10 || digits.length > 11
                ? "Informe um WhatsApp válido com DDD."
                : "";

        setFieldError(whatsappInput, errorElements.whatsapp, message);

        return !message;
    }

    function validateTheme() {
        const value = getFieldValue(temaInput);
        let message = "";

        if (value.length < 3) {
            message = "Informe o tema principal do e-book.";
        } else if (value.length > 200) {
            message = "O tema deve ter até 200 caracteres.";
        }

        setFieldError(temaInput, errorElements.tema, message);

        return !message;
    }

    function validateDescription() {
        const value = getFieldValue(descricaoInput);
        let message = "";

        if (value.length < MIN_DESCRIPTION_LENGTH) {
            message =
                `Escreva pelo menos ${MIN_DESCRIPTION_LENGTH} caracteres na descrição.`;
        } else if (value.length > MAX_DESCRIPTION_LENGTH) {
            message =
                `A descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`;
        }

        setFieldError(
            descricaoInput,
            errorElements.descricao,
            message
        );

        return !message;
    }

    /* =====================================================
       14. CONTADOR DA DESCRIÇÃO
    ===================================================== */

    function updateDescriptionCounter() {
        if (!descricaoInput) return;

        const length = descricaoInput.value.length;
        const complete = length >= MIN_DESCRIPTION_LENGTH;
        const remaining = Math.max(
            0,
            MIN_DESCRIPTION_LENGTH - length
        );

        if (counter) {
            counter.textContent =
                `${length.toLocaleString("pt-BR")} / ` +
                `${MAX_DESCRIPTION_LENGTH.toLocaleString("pt-BR")}`;

            counter.classList.toggle("is-complete", complete);
        }

        if (characterStatus) {
            characterStatus.classList.toggle("is-complete", complete);

            const statusText = $("span", characterStatus);

            if (statusText) {
                statusText.textContent = complete
                    ? "Mínimo de caracteres atingido."
                    : `Faltam ${remaining} caracteres.`;
            } else {
                characterStatus.textContent = complete
                    ? "Mínimo de caracteres atingido."
                    : `Faltam ${remaining} caracteres.`;
            }
        }
    }

    /* =====================================================
       15. FORMATAÇÃO DO WHATSAPP
    ===================================================== */

    function formatPhone(value) {
        const digits = value.replace(/\D/g, "").slice(0, 11);

        if (!digits) return "";
        if (digits.length <= 2) return `(${digits}`;

        if (digits.length <= 6) {
            return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        }

        if (digits.length <= 10) {
            return (
                `(${digits.slice(0, 2)}) ` +
                `${digits.slice(2, 6)}-${digits.slice(6)}`
            );
        }

        return (
            `(${digits.slice(0, 2)}) ` +
            `${digits.slice(2, 7)}-${digits.slice(7)}`
        );
    }

    whatsappInput?.addEventListener("input", () => {
        const oldValue = whatsappInput.value;
        const oldPosition =
            whatsappInput.selectionStart ?? oldValue.length;

        const digitsBeforeCursor = oldValue
            .slice(0, oldPosition)
            .replace(/\D/g, "").length;

        const formatted = formatPhone(oldValue);

        whatsappInput.value = formatted;

        let newPosition = 0;
        let digitsSeen = 0;

        while (
            newPosition < formatted.length &&
            digitsSeen < digitsBeforeCursor
        ) {
            if (/\d/.test(formatted[newPosition])) {
                digitsSeen++;
            }

            newPosition++;
        }

        try {
            whatsappInput.setSelectionRange(
                newPosition,
                newPosition
            );
        } catch {
            // Alguns dispositivos não permitem ajustar a seleção.
        }

        validatePhone();
        updateFormState();
    });

    /* =====================================================
       16. ESTADO DO FORMULÁRIO
    ===================================================== */

    function isFormValid() {
        const nameValid = validateName();
        const emailValid = validateEmail();
        const phoneValid = validatePhone();
        const themeValid = validateTheme();
        const descriptionValid = validateDescription();

        return (
            nameValid &&
            emailValid &&
            phoneValid &&
            themeValid &&
            descriptionValid &&
            Boolean(selectedPlan) &&
            termsInput?.checked === true
        );
    }

    function updateFormState() {
        if (!paymentButton || isSubmitting) return;

        const descriptionLength =
            getFieldValue(descricaoInput).length;

        const phoneLength = getPhoneDigits().length;

        const valid =
            Boolean(selectedPlan) &&
            getFieldValue(nomeInput).length >= 2 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                getFieldValue(emailInput)
            ) &&
            phoneLength >= 10 &&
            phoneLength <= 11 &&
            getFieldValue(temaInput).length >= 3 &&
            descriptionLength >= MIN_DESCRIPTION_LENGTH &&
            descriptionLength <= MAX_DESCRIPTION_LENGTH &&
            termsInput?.checked === true;

        paymentButton.disabled = !valid;

        paymentButton.setAttribute(
            "aria-disabled",
            String(!valid)
        );
    }

    nomeInput?.addEventListener("input", () => {
        validateName();
        updateFormState();
    });

    emailInput?.addEventListener("input", () => {
        validateEmail();
        updateFormState();
    });

    temaInput?.addEventListener("input", () => {
        validateTheme();
        updateFormState();
    });

    descricaoInput?.addEventListener("input", () => {
        updateDescriptionCounter();
        validateDescription();
        updateFormState();
    });

    termsInput?.addEventListener("change", updateFormState);

    [publicoInput, objetivoInput].forEach((input) => {
        input?.addEventListener("input", updateFormState);
        input?.addEventListener("change", updateFormState);
    });

    /* =====================================================
       17. ESTADO DO BOTÃO DE PAGAMENTO
    ===================================================== */

    function setSubmittingState(submitting) {
        isSubmitting = submitting;

        if (!paymentButton) return;

        paymentButton.classList.toggle("is-loading", submitting);
        paymentButton.disabled = submitting;

        paymentButton.setAttribute(
            "aria-busy",
            String(submitting)
        );

        if (buttonText) {
            buttonText.textContent = submitting
                ? "Registrando seu pedido..."
                : "Continuar para pagamento";
        }

        if (!submitting) {
            updateFormState();
        }
    }

    /* =====================================================
       18. REGISTRO DO PEDIDO NA API
    ===================================================== */

    async function submitOrder(orderData) {
        const controller = new AbortController();

        const timeout = window.setTimeout(
            () => controller.abort(),
            API_TIMEOUT
        );

        let response;

        try {
            response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(orderData),
                signal: controller.signal
            });
        } catch (error) {
            if (error.name === "AbortError") {
                throw new Error(
                    "O servidor demorou para responder. Confira se o pedido foi registrado antes de tentar novamente."
                );
            }

            throw new Error(
                "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."
            );
        } finally {
            window.clearTimeout(timeout);
        }

        const responseText = await response.text();
        let result = null;

        if (responseText.trim()) {
            try {
                result = JSON.parse(responseText);
            } catch {
                console.error(
                    "Resposta inválida da API:",
                    response.status,
                    responseText.slice(0, 300)
                );

                throw new Error(
                    `Resposta inválida do servidor (HTTP ${response.status}).`
                );
            }
        }

        if (!response.ok) {
            console.error("Erro da API:", response.status, result);

            const message = getReadableError(result);

            if (message !== "Ocorreu um erro inesperado.") {
                throw new Error(message);
            }

            throw new Error(
                response.status >= 500
                    ? "O servidor apresentou um erro ao registrar o pedido. Tente novamente mais tarde."
                    : `Não foi possível registrar o pedido (HTTP ${response.status}).`
            );
        }

        if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result)
        ) {
            throw new Error(
                "O servidor não confirmou o registro do pedido."
            );
        }

        const confirmed =
            result.ok === true ||
            result.success === true;

        if (!confirmed) {
            console.error("Registro não confirmado:", result);

            const message = getReadableError(result);

            throw new Error(
                message !== "Ocorreu um erro inesperado."
                    ? message
                    : "O servidor não confirmou o pedido. O pagamento não será aberto."
            );
        }

        return result;
    }

    /* =====================================================
       19. ENVIO DO PEDIDO E ABERTURA DA KIWIFY
    ===================================================== */

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (isSubmitting) return;

        showMessage();

        if (!isFormValid()) {
            showMessage(
                "Confira os campos obrigatórios, selecione um plano e aceite os termos.",
                "error"
            );

            const firstInvalid = $('[aria-invalid="true"]', form);

            if (firstInvalid) {
                firstInvalid.focus({ preventScroll: true });
                scrollToElement(firstInvalid);
            } else if (!selectedPlan) {
                scrollToElement($("#planos") || planCards[0]);
            } else if (termsInput && !termsInput.checked) {
                termsInput.focus({ preventScroll: true });
                scrollToElement(termsInput);
            }

            updateFormState();
            return;
        }

        const checkoutUrl = CHECKOUT_URLS[selectedPlan];

        if (!checkoutUrl) {
            showMessage(
                "Não foi possível identificar o pagamento deste plano.",
                "error"
            );
            return;
        }

        const orderData = {
            nome: getFieldValue(nomeInput),
            email: getFieldValue(emailInput).toLowerCase(),
            whatsapp: getPhoneDigits(),
            tema: getFieldValue(temaInput),
            descricao: getFieldValue(descricaoInput),
            publico: getFieldValue(publicoInput),
            objetivo: getFieldValue(objetivoInput),
            plano: selectedPlan,
            valor: PLAN_PRICES[selectedPlan],
            termosAceitos: termsInput?.checked === true
        };

        setSubmittingState(true);
        showMessage("Registrando seu pedido...", "info");

        try {
            const result = await submitOrder(orderData);

            console.info("Pedido registrado com sucesso.", {
                plano: selectedPlan,
                status: typeof result.status === "string"
                    ? result.status
                    : "registrado"
            });

            showMessage(
                "Pedido registrado! Abrindo o pagamento seguro...",
                "success"
            );

            window.location.assign(checkoutUrl);
        } catch (error) {
            console.error(
                "Erro ao registrar pedido:",
                error
            );

            showMessage(getReadableError(error), "error");
            setSubmittingState(false);
        }
    });

    /* =====================================================
       20. FAQ — ACESSIBILIDADE E INTERAÇÃO NATIVA
    ===================================================== */

    $$("details").forEach((item) => {
        const summary = $("summary", item);

        if (!summary) return;

        summary.setAttribute("aria-expanded", String(item.open));

        item.addEventListener("toggle", () => {
            summary.setAttribute(
                "aria-expanded",
                String(item.open)
            );
        });
    });

    /* =====================================================
       21. NAVEGAÇÃO POR ÂNCORAS
    ===================================================== */

    $$('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");

            if (!href || href === "#") return;

            const target = $(href);

            if (!target) return;

            event.preventDefault();

            /*
              Atualiza a URL e leva diretamente à seção.
              Sem atraso artificial, especialmente no celular.
            */

            if (window.location.hash !== href) {
                window.history.replaceState(
                    null,
                    "",
                    href
                );
            }

            scrollToElement(target);
        });
    });

    /* =====================================================
       22. INICIALIZAÇÃO
    ===================================================== */

    updateDescriptionCounter();
    updateFormState();

    planCards.forEach((card) => {
        const name = card.dataset.plan;

        if (name && !Object.prototype.hasOwnProperty.call(
            PLAN_PRICES,
            name
        )) {
            console.warn(
                `Plano sem preço configurado: ${name}`
            );
        }
    });

    console.info(
        "S7 Systems — JavaScript carregado com sucesso."
    );
});
