
const { createClient } = require("@supabase/supabase-js");

const PLANOS = {
    Essencial: {
        valor: 197,
        codigo: "ebook_essencial",
        nome: "Criação de E-book - Plano Essencial",
    },
    Profissional: {
        valor: 397,
        codigo: "ebook_profissional",
        nome: "Criação de E-book - Plano Profissional",
    },
    Premium: {
        valor: 697,
        codigo: "ebook_premium",
        nome: "Criação de E-book - Plano Premium",
    },
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
            console.error("Variáveis do Supabase não configuradas.");

            return res.status(500).json({
                ok: false,
                message: "A conexão com o banco não está configurada.",
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
                message: "Dados inválidos.",
            });
        }

        const nome = String(body.nome || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const whatsapp = String(body.whatsapp || "").trim();
        const tema = String(body.tema || "").trim();
        const descricao = String(body.descricao || "").trim();
        const publico = String(body.publico || "").trim();
        const objetivo = String(body.objetivo || "").trim();
        const planoNome = String(body.plano || "").trim();

        if (
            !nome ||
            !email ||
            !whatsapp ||
            !tema ||
            !descricao ||
            !planoNome
        ) {
            return res.status(400).json({
                ok: false,
                message: "Preencha os campos obrigatórios.",
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

        const plano = PLANOS[planoNome];

        if (!plano) {
            return res.status(400).json({
                ok: false,
                message: "Plano selecionado inválido.",
            });
        }

        if (body.termosAceitos !== true) {
            return res.status(400).json({
                ok: false,
                message: "Você precisa aceitar os termos.",
            });
        }

        const { data, error } = await supabase
            .from("ebook_pedidos")
            .insert({
                nome,
                email,
                telefone: whatsapp,
                whatsapp,
                produto_codigo: plano.codigo,
                produto_nome: plano.nome,
                valor: plano.valor,
                valor_pago: 0,
                moeda: "BRL",
                status: "pendente",
                descricao,
                observacoes: [
                    `Tema: ${tema}`,
                    `Público-alvo: ${publico || "Não informado"}`,
                    `Objetivo: ${objetivo || "Não informado"}`,
                    `Plano: ${planoNome}`,
                ].join("\n"),
            })
            .select("id")
            .single();

        if (error) {
            console.error("Erro Supabase ao registrar pedido:", error);

            return res.status(500).json({
                ok: false,
                message: "Não foi possível registrar o pedido. Tente novamente.",
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
            message: "Erro interno ao registrar o pedido.",
        });
    }
};
