interface Env {
  RESEND_API_KEY?: string;
  CONTRACT_FROM_EMAIL?: string;
  CONTRACT_PHOTOGRAPHER_EMAIL?: string;
  /** 設為 1 / true 時不呼叫 Resend（客戶端仍會收到 skipped 成功，方便純下載流程） */
  CONTRACT_DISABLE_EMAIL?: string;
}

/** 與前端 collectData() 對齊；寄給攝影師的信以文字為主便於 Gmail 搜尋 */
type SendContractBody = {
  slug?: string;
  clientName?: string;
  customerEmail?: string;
  phone?: string;
  lineName?: string;
  photographerEmail?: string;
  pdfBase64?: string;
  pdfFilename?: string;
  shootingDate?: string;
  shootingStartTime?: string;
  shootingEndTime?: string;
  packageName?: string;
  location?: string;
  pickup?: string;
  totalFee?: string;
  deposit?: string;
  balance?: string;
  deliverables?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  bankLast5?: string;
  paymentAmount?: string;
  paymentDate?: string;
  paymentNote?: string;
  fatherName?: string;
  motherName?: string;
  contactName?: string;
  clientAdultCount?: string;
  clientChildCount?: string;
  photographerAdultCount?: string;
  photographerChildCount?: string;
  childrenInfo?: string;
  familyIntro?: string;
  desiredShots?: string;
  specialNotes?: string;
  signerName?: string;
  signerDisplay?: string;
  signedDate?: string;
  signedAt?: string;
  contractVersion?: string;
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

function pick(body: SendContractBody, key: keyof SendContractBody): string {
  return String(body[key] ?? '').trim();
}

function line(label: string, value: string): string | null {
  const v = String(value ?? '').trim();
  if (!v) return null;
  return `${label}：${v}`;
}

function moneyLabel(label: string, raw: string): string | null {
  const t = String(raw ?? '').trim();
  if (!t) return null;
  const n = Number(t);
  if (Number.isFinite(n)) return `${label}：NT$${n.toLocaleString('zh-TW')}`;
  return `${label}：${t}`;
}

/** 主旨：密集關鍵字供 Gmail 搜尋（過長則截斷） */
function buildPhotographerSubject(body: SendContractBody): string {
  const clientName = pick(body, 'clientName');
  const slug = pick(body, 'slug');
  const shootingDate = pick(body, 'shootingDate');
  const pkg = pick(body, 'packageName');
  const phone = pick(body, 'phone');
  const lineId = pick(body, 'lineName');
  const email = pick(body, 'customerEmail');

  const chunks = [
    '【合約備份】',
    clientName || slug || '客戶',
    shootingDate ? `拍攝${shootingDate}` : '',
    pkg || '',
    phone ? `電話${phone}` : '',
    lineId ? `LINE ${lineId}` : '',
    email || '',
    slug ? `#${slug}` : '',
  ].filter(Boolean);

  let s = chunks.join('｜');
  if (s.length > 220) s = `${s.slice(0, 217)}…`;
  return s;
}

/** 純文字內文：與表單欄位對應，PDF 僅作附件備份 */
function buildPhotographerPlainText(body: SendContractBody): string {
  const shootingTime = [pick(body, 'shootingStartTime'), pick(body, 'shootingEndTime')]
    .filter(Boolean)
    .join(' - ');

  const blocks: string[] = [];

  function add(msg: string | null | undefined) {
    if (msg) blocks.push(msg);
  }

  blocks.push('=== 小巴老師｜親子寫真｜合約備份 ===');
  blocks.push('（請以此信文字搜尋客戶／檔期／方案；PDF 為附件備份，可不開檔）');
  blocks.push('');

  blocks.push('—— 專案識別 ——');
  add(line('客戶專頁 slug', pick(body, 'slug')));
  add(line('客戶名稱（預約）', pick(body, 'clientName')));
  add(line('合約版本', pick(body, 'contractVersion')));
  blocks.push('');

  blocks.push('—— 預約／方案 ——');
  add(line('拍攝日期', pick(body, 'shootingDate')));
  add(line('拍攝時間', shootingTime));
  add(line('方案', pick(body, 'packageName')));
  add(line('地點／行程', pick(body, 'location')));
  add(line('接送', pick(body, 'pickup')));
  add(moneyLabel('總費用', pick(body, 'totalFee')));
  add(moneyLabel('訂金', pick(body, 'deposit')));
  add(moneyLabel('餘款', pick(body, 'balance')));
  const del = pick(body, 'deliverables');
  if (del) blocks.push(`成品內容：\n${del}`);
  blocks.push('');

  blocks.push('—— 付款 ——');
  add(line('客戶付款狀態', pick(body, 'paymentStatus')));
  add(line('付款方式', pick(body, 'paymentMethod')));
  add(line('匯款後四／末五碼', pick(body, 'bankLast5')));
  add(moneyLabel('付款金額', pick(body, 'paymentAmount')));
  add(line('付款日期', pick(body, 'paymentDate')));
  add(line('付款備註', pick(body, 'paymentNote')));
  blocks.push('');

  blocks.push('—— 聯絡方式 ——');
  add(line('電話', pick(body, 'phone')));
  add(line('LINE', pick(body, 'lineName')));
  add(line('Email', pick(body, 'customerEmail')));
  blocks.push('');

  blocks.push('—— 客戶填寫 ——');
  add(line('爸爸稱呼', pick(body, 'fatherName')));
  add(line('媽媽稱呼', pick(body, 'motherName')));
  add(line('主要聯絡人', pick(body, 'contactName')));
  add(line('入鏡大人（客戶填）', pick(body, 'clientAdultCount')));
  add(line('入鏡小孩（客戶填）', pick(body, 'clientChildCount')));
  add(line('攝影師預設入鏡大人', pick(body, 'photographerAdultCount')));
  add(line('攝影師預設入鏡小孩', pick(body, 'photographerChildCount')));
  const ch = pick(body, 'childrenInfo');
  if (ch) blocks.push(`小朋友年齡／稱呼：\n${ch}`);
  const intro = pick(body, 'familyIntro');
  if (intro) blocks.push(`家庭介紹：\n${intro}`);
  const shots = pick(body, 'desiredShots');
  if (shots) blocks.push(`特別想拍：\n${shots}`);
  const notes = pick(body, 'specialNotes');
  if (notes) blocks.push(`注意事項：\n${notes}`);
  blocks.push('');

  blocks.push('—— 簽署 ——');
  add(line('簽名人', pick(body, 'signerDisplay') || pick(body, 'signerName')));
  add(line('簽署日期', pick(body, 'signedDate')));
  add(line('簽署時間', pick(body, 'signedAt')));
  blocks.push('');

  blocks.push('—— 附件 ——');
  blocks.push('此信附檔為同一筆合約 PDF，與客戶下載之檔案應一致。');

  return blocks.join('\n');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: SendContractBody;
  try {
    body = (await context.request.json()) as SendContractBody;
  } catch {
    return json({ ok: false, message: '請提供正確的 JSON 內容' }, 400);
  }

  const slug = pick(body, 'slug');
  const clientName = pick(body, 'clientName');
  const customerEmail = pick(body, 'customerEmail');
  const phone = pick(body, 'phone');
  const lineName = pick(body, 'lineName');
  let pdfBase64 = String(body.pdfBase64 || '').trim().replace(/\s/g, '');
  const pdfFilename = pick(body, 'pdfFilename') || `contract-${slug || 'client'}.pdf`;
  const photographerEmail = pick(body, 'photographerEmail')
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
    return json({
      ok: true,
      skipped: true,
      reason: 'no_api_key',
      message: '未設定 Email API，略過攝影師信箱備份',
    });
  }

  const fromEmail = context.env.CONTRACT_FROM_EMAIL || 'Family Contract <onboarding@resend.dev>';
  const subject = buildPhotographerSubject(body);
  const text = buildPhotographerPlainText(body);

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
