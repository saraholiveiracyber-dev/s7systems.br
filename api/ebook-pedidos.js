
const { createClient } = require("@supabase/supabase-js");

const PLANOS = {
    Essencial: 197,
    Profissional: 397,
    Premium: 697,
};

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({
            ok: false,
            message: "Método não permitido. Utilize POST.",
        });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
            return res.status(500).json({
                ok: false,
                message: "A API ainda não está configurada no servidor.",
            });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        let body = req.body;

        if (typeof body === "string") {
            body = JSON.parse(body);
        }

        if (!body || typeof body !== "object") {
            return res.status(400).json({
                ok: false,
                message: "Os dados enviados são inválidos.",
            });
        }

        const nome = String(body.nome || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const whatsapp = String(body.whatsapp || "").trim();
        const tema = String(body.tema || "").trim();
        const descricao = String(body.descricao || "").trim();
        const publico = String(body.publico || "").trim();
        const objetivo = String(body.objetivo || "").trim();
        const plano = String(body.plano || "").trim();

        if (
            !nome ||
            !email ||
            !whatsapp ||
            !tema ||
            !descricao ||
            !plano
        ) {
            return res.status(400).json({
                ok: false,
                message: "Preencha todos os campos obrigatórios.",
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                ok: false,
                message: "Informe um e-mail válido.",
            });
        }

        if (descricao.length < 500 || descricao.length > 5000) {
            return res.status(400).json({
                ok: false,
                message: "A descrição deve ter entre 500 e 5.000 caracteres.",
            });
        }

        if (!Object.prototype.hasOwnProperty.call(PLANOS, plano)) {
            return res.status(400).json({
                ok: false,
                message: "Plano selecionado inválido.",
            });
        }

        if (body.termosAceitos !== true) {
            return res.status(400).json({
                ok: false,
                message: "Você precisa aceitar os termos para continuar.",
            });
        }

        const valor = PLANOS[plano];

        const { data, error } = await supabase
            .from("ebook_pedidos")
            .insert({
                nome,
                email,
                whatsapp,
                tema,
                descricao,
                publico,
                objetivo,
                plano,
                valor,
                status: "aguardando_pagamento",
            })
            .select("id")
            .single();

        if (error) {
            console.error("Erro ao registrar pedido no Supabase:", error);

            return res.status(500).json({
                ok: false,
                message: "Não foi possível registrar o pedido. Confira a tabela ebook_pedidos no Supabase.",
            });
        }

        return res.status(201).json({
            ok: true,
            success: true,
            id: data.id,
            message: "Pedido registrado com sucesso.",
        });
    } catch (error) {
        console.error("Erro na API de pedidos:", error);

        return res.status(500).json({
            ok: false,
            message: "Erro interno ao processar o pedido.",
        });
    }
};
