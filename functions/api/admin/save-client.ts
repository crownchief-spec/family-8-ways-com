interface Env {
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  ADMIN_PASSWORD?: string;
}

type SaveBody = {
  adminPassword?: string;
  path?: string;
  markdown?: string;
  slug?: string;
};

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const ALLOWED_PREFIX = /^content\/clients\/[a-zA-Z0-9_.-]+\.md$/;
const ALLOWED_PREFIX_SRC = /^src\/content\/clients\/[a-zA-Z0-9_.-]+\.md$/;

function isAllowedPath(p: string): boolean {
  return ALLOWED_PREFIX.test(p) || ALLOWED_PREFIX_SRC.test(p);
}

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** 供編輯頁偵測是否可自動寫入 GitHub（不需密碼）；不回傳任何 secret */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const token = context.env.GITHUB_TOKEN?.trim();
  const owner = context.env.GITHUB_OWNER?.trim();
  const repo = context.env.GITHUB_REPO?.trim();
  const missingGithubEnv: string[] = [];
  if (!token) missingGithubEnv.push('GITHUB_TOKEN');
  if (!owner) missingGithubEnv.push('GITHUB_OWNER');
  if (!repo) missingGithubEnv.push('GITHUB_REPO');
  return json({
    ok: true,
    githubConfigured: missingGithubEnv.length === 0,
    missingGithubEnv,
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: SaveBody;
  try {
    body = (await context.request.json()) as SaveBody;
  } catch {
    return json({ ok: false, message: '請提供正確的 JSON 內容' }, 400);
  }

  const expected = (context.env.ADMIN_PASSWORD || '5551').trim();
  const adminPassword = String(body.adminPassword || '').trim();
  if (!adminPassword || adminPassword !== expected) {
    return json({ ok: false, message: '後台密碼錯誤或未提供' }, 401);
  }

  const path = String(body.path || '').trim();
  const markdown = String(body.markdown || '');
  const slug = String(body.slug || '').trim();

  if (!path || !isAllowedPath(path)) {
    return json({ ok: false, message: '不允許的檔案路徑' }, 400);
  }
  if (!markdown || markdown.length > 800000) {
    return json({ ok: false, message: 'Markdown 內容無效或過大' }, 400);
  }

  const token = context.env.GITHUB_TOKEN?.trim();
  const ownerPre = String(context.env.GITHUB_OWNER || '').trim();
  const repoPre = String(context.env.GITHUB_REPO || '').trim();
  if (!token) {
    return json({
      ok: false,
      githubConfigured: false,
      missingGithubEnv: ['GITHUB_TOKEN'],
      message:
        '線上環境讀不到 GITHUB_TOKEN。請到 Cloudflare → Pages 專案 → Settings → Variables and Secrets → 選 Production → 新增類型為 Secret、名稱為 GITHUB_TOKEN（全大寫、無空格）的變數，貼上 GitHub PAT 後儲存，並到 Deployments 對最新部署執行 Retry deployment。',
    });
  }

  const owner = ownerPre;
  const repo = repoPre;
  const branch = String(context.env.GITHUB_BRANCH || 'main').trim();

  if (!owner || !repo) {
    const missing: string[] = [];
    if (!owner) missing.push('GITHUB_OWNER');
    if (!repo) missing.push('GITHUB_REPO');
    return json(
      {
        ok: false,
        githubConfigured: false,
        missingGithubEnv: missing,
        message: '尚未設定 GITHUB_OWNER 或 GITHUB_REPO（Production 環境變數）。',
      },
      500,
    );
  }

  const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'family-8-ways-save-client',
  };

  let sha: string | undefined;
  const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
    method: 'GET',
    headers,
  });

  if (getRes.status === 404) {
    sha = undefined;
  } else if (!getRes.ok) {
    const t = await getRes.text();
    return json({ ok: false, message: `讀取 GitHub 檔案失敗：${t}` }, 502);
  } else {
    const meta = (await getRes.json()) as { sha?: string; type?: string };
    if (meta.type !== 'file' || !meta.sha) {
      return json({ ok: false, message: 'GitHub 路徑不是單一檔案' }, 400);
    }
    sha = meta.sha;
  }

  const putBody: Record<string, string> = {
    message: `Update client: ${slug || path}`,
    content: utf8ToBase64(markdown),
    branch,
  };
  if (sha) putBody.sha = sha;

  const putRes = await fetch(apiBase, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const t = await putRes.text();
    return json({ ok: false, message: `寫入 GitHub 失敗：${t}` }, 502);
  }

  return json({ ok: true, message: '客戶 MD 已更新' });
};
