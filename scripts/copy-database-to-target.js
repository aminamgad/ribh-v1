#!/usr/bin/env node
/**
 * نسخ كامل لقاعدة البيانات من المصدر (MONGODB_URI) إلى الهدف (MONGODB_URI_TARGET).
 * ينسخ جميع المجموعات وجميع الوثائق دون استثناء، مع الفهارس.
 *
 * الاستخدام:
 *   1. ضع في .env.local:
 *      MONGODB_URI=...          (قاعدة المصدر الحالية)
 *      MONGODB_URI_TARGET=...   (قاعدة الهدف، مثال: mongodb+srv://user:pass@cluster.mongodb.net/DBNAME?appName=...)
 *   2. تشغيل: node scripts/copy-database-to-target.js
 *   يتم استبدال محتوى كل مجموعة في الهدف بمحتوى المصدر (بدون تجاهل أي وثيقة).
 *
 * لا يُخزّن رابط الهدف أو كلمة المرور في الكود — استخدم متغير البيئة فقط.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const BATCH_SIZE = 1000;

async function copyCollection(sourceConn, targetConn, collectionName) {
  const sourceCol = sourceConn.db.collection(collectionName);
  const targetCol = targetConn.db.collection(collectionName);

  const count = await sourceCol.countDocuments();
  if (count === 0) {
    return { name: collectionName, documents: 0, indexes: 0, skipped: true };
  }

  await targetCol.deleteMany({});

  let inserted = 0;
  let cursor = sourceCol.find({});
  let batch = [];

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      const result = await targetCol.insertMany(batch, { ordered: false });
      inserted += result.insertedCount || batch.length;
      batch = [];
    }
  }
  if (batch.length > 0) {
    const result = await targetCol.insertMany(batch, { ordered: false });
    inserted += result.insertedCount ?? result.insertedCount ?? batch.length;
  }

  const indexes = await sourceCol.indexes();
  const toCreate = indexes.filter((idx) => idx.name !== '_id_');
  for (const idx of toCreate) {
    const keys = idx.key;
    const options = { ...idx };
    delete options.key;
    delete options.v;
    delete options.ns;
    await targetCol.createIndex(keys, options).catch((err) => {
      console.warn(`${colors.yellow}  ⚠ Index ${idx.name}: ${err.message}${colors.reset}`);
    });
  }

  return {
    name: collectionName,
    documents: inserted,
    indexes: toCreate.length,
    skipped: false,
  };
}

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ribh-ecommerce';
  const MONGODB_URI_TARGET = process.env.MONGODB_URI_TARGET;

  if (!MONGODB_URI) {
    console.error(`${colors.red}❌ MONGODB_URI غير موجود في .env.local${colors.reset}`);
    process.exit(1);
  }
  if (!MONGODB_URI_TARGET) {
    console.error(`${colors.red}❌ MONGODB_URI_TARGET غير موجود في .env.local. أضفه (رابط قاعدة الهدف).${colors.reset}`);
    process.exit(1);
  }

  console.log(`
${colors.bright}${colors.blue}
╔══════════════════════════════════════════════════════════╗
║   نسخ كامل لقاعدة البيانات (المصدر → الهدف)              ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}
  ${colors.cyan}المصدر:${colors.reset}  من MONGODB_URI
  ${colors.cyan}الهدف:${colors.reset}  من MONGODB_URI_TARGET
`);

  let sourceConn;
  let targetConn;

  try {
    console.log(`${colors.cyan}🔌 الاتصال بقاعدة المصدر...${colors.reset}`);
    sourceConn = mongoose.createConnection(MONGODB_URI, {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 15000,
    });
    await sourceConn.asPromise();
    const sourceDbName = sourceConn.db.databaseName;
    console.log(`${colors.green}✅ متصل بالمصدر: ${sourceDbName}${colors.reset}\n`);

    console.log(`${colors.cyan}🔌 الاتصال بقاعدة الهدف...${colors.reset}`);
    targetConn = mongoose.createConnection(MONGODB_URI_TARGET, {
      maxPoolSize: 2,
      serverSelectionTimeoutMS: 15000,
    });
    await targetConn.asPromise();
    const targetDbName = targetConn.db.databaseName;
    const targetConnToUse =
      targetDbName === 'test' && sourceDbName !== 'test'
        ? targetConn.useDb(sourceDbName)
        : targetConn;
    const finalTargetDbName = targetConnToUse.db.databaseName;
    console.log(`${colors.green}✅ متصل بالهدف: ${finalTargetDbName}${colors.reset}\n`);

    const collections = await sourceConn.db.listCollections().toArray();
    const names = collections.map((c) => c.name).filter((n) => !n.startsWith('system.'));

    console.log(`${colors.cyan}📋 عدد المجموعات (بدون system.*): ${names.length}${colors.reset}\n`);

    const results = [];
    for (const name of names) {
      process.stdout.write(`  📂 ${name} ... `);
      try {
        const r = await copyCollection(sourceConn, targetConnToUse, name);
        results.push(r);
        if (r.skipped) {
          console.log(`${colors.yellow}فارغة (تم تخطيها)${colors.reset}`);
        } else {
          console.log(`${colors.green}${r.documents} وثيقة، ${r.indexes} فهرس${colors.reset}`);
        }
      } catch (err) {
        console.log(`${colors.red}فشل: ${err.message}${colors.reset}`);
        results.push({ name, documents: 0, indexes: 0, error: err.message });
      }
    }

    const totalDocs = results.reduce((s, r) => s + (r.documents || 0), 0);
    const totalIndexes = results.reduce((s, r) => s + (r.indexes || 0), 0);

    console.log(`
${colors.bright}${colors.green}✅ انتهى النسخ${colors.reset}
  📊 مجموعات: ${results.length}
  📄 وثائق منسوخة: ${totalDocs}
  📇 فهارس: ${totalIndexes}
`);

    await sourceConn.close();
    await targetConn.close();
    console.log(`${colors.green}👋 تم قطع الاتصال${colors.reset}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${colors.red}❌ خطأ: ${err.message}${colors.reset}`);
    console.error(err.stack);
    if (sourceConn && sourceConn.readyState === 1) await sourceConn.close().catch(() => {});
    if (targetConn && targetConn.readyState === 1) await targetConn.close().catch(() => {});
    process.exit(1);
  }
}

run();
