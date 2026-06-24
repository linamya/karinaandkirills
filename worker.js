/**
 * Cloudflare Worker — принимает данные анкеты гостя с сайта
 * и отправляет их сообщением в Telegram-бота.
 *
 * НАСТРОЙКА (см. подробную инструкцию в файле INSTRUCTIONS.md):
 * 1. Создайте Worker на dash.cloudflare.com
 * 2. Вставьте этот код в редактор Worker'а
 * 3. Замените BOT_TOKEN и CHAT_ID ниже на свои значения
 *    (можно прямо в коде — см. блок CONFIG)
 * 4. Сохраните и разверните (Deploy)
 * 5. Скопируйте адрес Worker'а (например https://wedding-rsvp.ivanov.workers.dev)
 *    и вставьте его в index.html в переменную WORKER_URL
 */

/* ================== CONFIG ================== */
const BOT_TOKEN = "8946706054:AAGxVtqgr7-8vrCk3lyCdbdWlss--JwlyLY";
const CHAT_ID   = "1801013206";

// Разрешённый адрес вашего сайта (для защиты от чужих запросов).
// Если сайт открывается с разных доменов/локально — можно временно поставить "*"
const ALLOWED_ORIGIN = "*";
/* ============================================== */

export default {
  async fetch(request) {
    // Обработка предварительного CORS-запроса браузера
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    try {
      const data = await request.json();

      const name = (data.name || "").toString().trim();
      const attendance = (data.attendance || "").toString().trim();
      const phone = (data.phone || "").toString().trim();

      if (!name || !attendance || !phone) {
        return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        });
      }

      const text =
        `💌 Новый ответ на анкету гостя\n\n` +
        `👤 Имя: ${escapeHtml(name)}\n` +
        `✅ Присутствие: ${escapeHtml(attendance)}\n` +
        `📞 Телефон: ${escapeHtml(phone)}`;

      const tgResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: text,
          }),
        }
      );

      if (!tgResponse.ok) {
        const errBody = await tgResponse.text();
        return new Response(
          JSON.stringify({ ok: false, error: "telegram_failed", details: errBody }),
          { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders() } }
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: "server_error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
