const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const raiz = path.resolve(__dirname, "..", "..");
const arquivoEnv = path.join(raiz, ".env");
const arquivoMigration = path.join(raiz, "database", "migrations", "029_business_intelligence.sql");

function carregarEnvLocal() {
  if (!fs.existsSync(arquivoEnv)) {
    return;
  }

  const linhas = fs.readFileSync(arquivoEnv, "utf8").split(/\r?\n/);
  for (const linha of linhas) {
    const texto = linha.trim();
    if (!texto || texto.startsWith("#") || !texto.includes("=")) {
      continue;
    }

    const indice = texto.indexOf("=");
    const chave = texto.slice(0, indice).trim();
    const valor = texto.slice(indice + 1).trim().replace(/^["']|["']$/g, "");
    if (chave && process.env[chave] === undefined) {
      process.env[chave] = valor;
    }
  }
}

async function aplicarMigration() {
  carregarEnvLocal();

  const bancoUrl = process.env.BANCO_URL || process.env.DATABASE_URL;
  if (!bancoUrl) {
    throw new Error("Defina BANCO_URL ou DATABASE_URL antes de aplicar a migration do Business Intelligence.");
  }

  // Esta migration cria/atualiza a estrutura nativa do BI, permissões, consultas e dados de exemplo.
  const sql = fs.readFileSync(arquivoMigration, "utf8").replace(/^\uFEFF/, "");
  const pool = new Pool({
    connectionString: bancoUrl,
    ssl: process.env.BANCO_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(sql);
    console.log("Migration 029_business_intelligence.sql aplicada com sucesso.");
  } finally {
    await pool.end();
  }
}

aplicarMigration().catch((erro) => {
  console.error("Falha ao aplicar o banco do Business Intelligence:");
  console.error(erro.message || erro);
  process.exit(1);
});
