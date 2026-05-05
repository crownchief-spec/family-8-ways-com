interface Env {
  RESEND_API_KEY?: string;
  CONTRACT_FROM_EMAIL?: string;
  CONTRACT_PHOTOGRAPHER_EMAIL?: string;
  /** 設為 1 / true 時不呼叫 Resend（客戶端仍會收到 skipped 成功，方便純下載流程） */
  CONTRACT_DISABLE_EMAIL?: string;
}

type SendContractBody = {
  slug?: string;
  clientName?: string;
  customerEmail?: string;
  phone?: string;
  lineName?: string;
  photographerEmail?: string;
  subject?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  formData?: Record<string, unknown>;
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function truthyEnv(v: string | undefined): boolean {
  const s = String(v || '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: SendContractBody;
  try {
    body = (await context.request.json()) as SendContractBody;
  } catch {
    return json({ ok: false, message: '請提供正確的 JSON 內容' }, 400);
  }

  const slug = String(body.slug || '').trim();
  const clientName = String(body.clientName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  const phone = String(body.phone || '').trim();
  const lineName = String(body.lineName || '').trim();
  let pdfBase64 = String(body.pdfBase64 || '').trim().replace(/\s/g, '');
  const pdfFilename = String(body.pdfFilename || '').trim() || `contract-${slug || 'client'}.pdf`;
  const photographerEmail = String(body.photographerEmail || '').trim()
    || context.env.CONTRACT_PHOTOGRAPHER_EMAIL
    || 'crownchief@gmail.com';

  if (!slug) return json({ ok: false, message: 'slug 不可空白' }, 400);
  if (customerEmail && !validEmail(customerEmail)) {
    return json({ ok: false, message: '客戶 Email 格式不正確' }, 400);
  }
  if (!phone && !lineName && !customerEmail) {
    return json(
      { ok: false, message: '至少需要一種客戶聯絡方式（電話、LINE 或 Email）' },
      400,
    );
  }
  if (!pdfBase64) return json({ ok: false, message: 'pdfBase64 不可空白' }, 400);

  try {
    const binary = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
    const isPdf =
      binary.length >= 4
      && binary[0] === 0x25
      && binary[1] === 0x50
      && binary[2] === 0x44
      && binary[3] === 0x46;
    if (!isPdf) {
      return json({ ok: false, message: '附件不是有效的 PDF（請重新送出合約）' }, 400);
    }
  } catch {
    return json({ ok: false, message: 'PDF 附件編碼無法解析' }, 400);
  }
  if (!validEmail(photographerEmail)) {
    return json({ ok: false, message: '攝影師信箱設定不正確' }, 400);
  }

  /** 純下載流程：不寄任何信 */
  if (truthyEnv(context.env.CONTRACT_DISABLE_EMAIL)) {
    return json({
      ok: true,
      skipped: true,
      reason: 'disabled',
      message: '未寄信（後台已關閉合約備份信）',
    });
  }

  const apiKey = context.env.RESEND_API_KEY;
  if (!apiKey) {
    /** 未設定 API 時不視為錯誤，避免客戶端以為整份流程失敗 */
    return json({
      ok: true,
      skipped: true,
      reason: 'no_api_key',
      message: '未設定 Email API，略過攝影師信箱備份',
    });
  }

  const fromEmail = context.env.CONTRACT_FROM_EMAIL || 'Family Contract <onboarding@resend.dev>';
  const contactBits = [
    customerEmail ? `Email：${customerEmail}` : '',
    phone ? `電話：${phone}` : '',
    lineName ? `LINE：${lineName}` : '',
  ].filter(Boolean);

  const subject =
    body.subject
    || `【備份】預約確認書｜${clientName || slug}${
      customerEmail ? `｜${customerEmail}` : ''
    }`;

  const text = [
    '此為後台備份信：客戶已在網站完成簽名，並應已下載預約確認書 PDF。',
    ...contactBits,
    '請保留附件以利對帳；若未收到此信，請請客戶轉傳已下載的 PDF。',
  ].join('\n');

  /** 郵件附件檔名僅用 ASCII，避免部分信件閘道對檔名編碼異常導致附件毀損 */
  const asciiAttachName = `contract-${slug.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;

  const basePayload = {
    from: fromEmail,
    subject,
    text,
    attachments: [
      {
        filename: asciiAttachName,
        content: pdfBase64,
      },
    ],
  };

  /** 只寄給攝影師；不向客戶信箱寄送（避免 Resend／網域驗證問題打斷流程） */
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...basePayload,
      to: [photographerEmail],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json(
      {
        ok: false,
        message: `Resend 寄送失敗（攝影師備份）：${detail}`,
      },
      500,
    );
  }

  return json({
    ok: true,
    skipped: false,
    message: '攝影師備份信已寄出',
    sentTo: [photographerEmail],
  });
};
