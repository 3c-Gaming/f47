/**
 * Sistema de Tracking Telegram com Load Balancing
 * Integração entre HTML landing page e bot Telegram
 */

const DESTINATIONS = [{ flowId: "6a846d1cdfce179059071a9e", weight: 25 }, { flowId: "6a846d225934fc02ca0c99a5", weight: 25 }, { flowId: "6a846d2a251672bd780d9e09", weight: 25 }, { flowId: "6a846d2fdfce179059071aa0", weight: 25 }];

const TRACKING_ENDPOINT = "https://tracking-edge-ingest.3cgg.workers.dev/postback/landing?token=2dd0db8ca21b96cc2f11424e90a41d509d5166f88301db7a";

const BOT_USERNAME = "pilhado_tipster_bot";

/**
 * Gera Lead ID único com timestamp de São Paulo
 */
function buildLeadId() {
    const uuid = (() => {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
    })();

    const parts = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date());

    const get = (type) => parts.find((p) => p.type === type)?.value ?? "00";

    return `${get("day")}-${get("month")}-${get("hour")}-${get("minute")}-f47-pilhado-${uuid}`;
}

/**
 * Seleciona destino com load balancing baseado em peso
 */
function pickDestination() {
    const rand = Math.random() * 100;
    let accumulated = 0;

    for (const dest of DESTINATIONS) {
        accumulated += dest.weight;
        if (rand < accumulated) return dest;
    }

    return DESTINATIONS[DESTINATIONS.length - 1];
}

/**
 * Extrai valor de cookie
 */
function getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
}

/**
 * Extrai parâmetro de URL
 */
function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
}

/**
 * Função principal: Redireciona para Telegram com tracking
 */
function goTelegram() {
    const { flowId } = pickDestination();
    const lead_id = buildLeadId();

    // Facebook tracking
    const fbp = getCookie("_fbp");
    const fbclid = getUrlParam("fbclid");
    const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : getCookie("_fbc");

    const utm_source = getUrlParam("utm_source");
    const utm_medium = getUrlParam("utm_medium");
    const utm_campaign = getUrlParam("utm_campaign");
    const utm_content = getUrlParam("utm_content");

    // Captura pro nosso tracking
    navigator.sendBeacon(
        TRACKING_ENDPOINT,
        JSON.stringify({
            event: "lead",
            lead_id,
            fbc,
            fbp,
            fbclid,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            flow_id: flowId,
            bot_username: BOT_USERNAME,
        }),
    );

    // dataLayer pro GTM
    window.dataLayer = window.dataLayer || [];
    dataLayer.push({ event: 'cta_click', lead_id: lead_id });

    // Redirecionar para Telegram via SendPulse
    const e = encodeURIComponent;

    window.location.href =
        `https://tg.pulse.is/${BOT_USERNAME}` +
        `?start=${e(flowId)}` +
        `&lead_id=${e(lead_id)}` +
        `&fbp=${e(fbp)}` +
        `&fbc=${e(fbc)}` +
        `&fbclid=${e(fbclid)}` +
        `&utm_source=${e(utm_source)}` +
        `&utm_medium=${e(utm_medium)}` +
        `&utm_campaign=${e(utm_campaign)}` +
        `&utm_content=${e(utm_content)}`;
}

// Expõe funções globalmente para onclick dos botões
window.goTelegram = goTelegram;
window.goWhatsApp = goTelegram; // backward compat
