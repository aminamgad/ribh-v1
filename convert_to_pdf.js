const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// قائمة ملفات الكتاب
const bookFiles = [
  'كتاب_تعلم_البرمجة_من_الصفر.md',
  'كتاب_تعلم_البرمجة_من_الصفر_الجزء_الثاني.md',
  'كتاب_تعلم_البرمجة_من_الصفر_الجزء_الثالث.md',
  'كتاب_تعلم_البرمجة_من_الصفر_الجزء_الرابع.md',
  'كتاب_تعلم_البرمجة_من_الصفر_الجزء_الخامس.md',
  'مشاريع_إضافية.md'
];

// دمج جميع الملفات في ملف واحد
function mergeBookFiles() {
    let fullBook = '';
    
    // إضافة مقدمة الكتاب
    fullBook += `# كتاب تعلم البرمجة من الصفر حتى Full Stack
## دليل شامل لتعلم تطوير الويب باللغة المصرية

---

### مقدمة الكتاب

أهلاً وسهلاً بيك في رحلة تعلم البرمجة من الصفر! هنتعلم مع بعض كل حاجة من أول HTML و CSS و JavaScript، مروراً بـ React و Next.js و Tailwind CSS و TypeScript، ووصولاً للباك إند بـ Node.js و Express و MongoDB و SQL.

هذا الكتاب هيكون دليلك الشامل لتصبح مطور Full Stack محترف. كل فصل هيبني على اللي قبله، عشان تضمن إنك فاهم كل حاجة كويس قبل ما تنتقل للخطوة اللي بعدها.

---

## جدول المحتويات

### الجزء الأول: أساسيات الويب
1. [مقدمة في البرمجة](#مقدمة-في-البرمجة)
2. [HTML - هيكل الصفحة](#html---هيكل-الصفحة)
3. [CSS - تنسيق الصفحة](#css---تنسيق-الصفحة)
4. [JavaScript - البرمجة الأساسية](#javascript---البرمجة-الأساسية)

### الجزء الثاني: تطوير الواجهة الأمامية
5. [React - مكتبة واجهة المستخدم](#react---مكتبة-واجهة-المستخدم)
6. [Next.js - إطار العمل المتقدم](#nextjs---إطار-العمل-المتقدم)
7. [Tailwind CSS - إطار التصميم](#tailwind-css---إطار-التصميم)
8. [TypeScript - البرمجة الآمنة](#typescript---البرمجة-الآمنة)

### الجزء الثالث: تطوير الخلفية
9. [Node.js - بيئة التشغيل](#nodejs---بيئة-التشغيل)
10. [Express - إطار العمل](#express---إطار-العمل)
11. [MongoDB - قاعدة البيانات](#mongodb---قاعدة-البيانات)
12. [SQL - قواعد البيانات العلائقية](#sql---قواعد-البيانات-العلائقية)

### الجزء الرابع: المشاريع العملية
13. [مشروع تطبيق المهام](#مشروع-تطبيق-المهام)
14. [مشروع متجر إلكتروني](#مشروع-متجر-إلكتروني)
15. [مشروع منصة تعليمية](#مشروع-منصة-تعليمية)

---

`;

    // قراءة ودمج جميع الملفات
    bookFiles.forEach((file, index) => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            fullBook += content;
            
            // إضافة فواصل بين الأجزاء
            if (index < bookFiles.length - 1) {
                fullBook += '\n\n---\n\n';
            }
        } catch (error) {
            console.error(`خطأ في قراءة الملف ${file}:`, error.message);
        }
    });

    // إضافة خاتمة الكتاب
    fullBook += `

---

## خاتمة الكتاب

مبروك! لقد أكملت رحلة تعلم البرمجة من الصفر حتى Full Stack. 

### ما تعلمته:
- ✅ أساسيات HTML و CSS و JavaScript
- ✅ تطوير واجهات المستخدم بـ React
- ✅ إطار العمل المتقدم Next.js
- ✅ تصميم حديث بـ Tailwind CSS
- ✅ برمجة آمنة بـ TypeScript
- ✅ تطوير الباك إند بـ Node.js و Express
- ✅ قواعد البيانات MongoDB و SQL
- ✅ بناء مشاريع عملية كاملة

### الخطوات التالية:
1. **استمر في التعلم**: التقنيات بتتطور بسرعة
2. **ابن مشاريع**: التطبيق العملي أهم من النظرية
3. **شارك معرفتك**: علم غيرك ما تعلمته
4. **انضم للمجتمعات**: تعرف على مطورين آخرين
5. **ابني portfolio**: اعرض مشاريعك للعالم

### نصائح للنجاح:
- **اصبر**: التعلم بياخد وقت
- **تمرن**: الكود بيحتاج ممارسة
- **اسأل**: لا تخاف تسأل عن أي حاجة
- **شارك**: ساعد غيرك في التعلم
- **استمتع**: البرمجة ممتعة جداً!

### مصادر إضافية:
- [MDN Web Docs](https://developer.mozilla.org/ar/)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**🎉 مبروك! أنت الآن مطور Full Stack محترف!**

أتمنى أن يكون هذا الكتاب مفيداً لك في رحلة تعلم البرمجة. 
تذكر: البرمجة رحلة ممتعة ومستمرة، استمتع بها! 🚀

---

*تم إنتاج هذا الكتاب باللغة المصرية لتعلم البرمجة من الصفر*
*جميع الحقوق محفوظة © 2024*
`;

    // حفظ الملف المدمج
    fs.writeFileSync('كتاب_تعلم_البرمجة_كامل.md', fullBook, 'utf8');
    console.log('✅ تم دمج جميع أجزاء الكتاب بنجاح');
    
    return 'كتاب_تعلم_البرمجة_كامل.md';
}

// تحويل Markdown إلى PDF
function convertToPDF(inputFile) {
    console.log('🔄 جاري تحويل الكتاب إلى PDF...');
    
    // استخدام pandoc إذا كان متوفراً
    const pandocCommand = `pandoc "${inputFile}" -o "كتاب_تعلم_البرمجة_من_الصفر.pdf" --pdf-engine=xelatex -V mainfont="Arial" -V dir=rtl -V lang=ar`;
    
    exec(pandocCommand, (error, stdout, stderr) => {
        if (error) {
            console.log('❌ خطأ في استخدام pandoc، جاري تجربة طريقة بديلة...');
            
            // استخدام طريقة بديلة (Node.js HTML to PDF)
            convertToHTMLThenPDF(inputFile);
        } else {
            console.log('✅ تم تحويل الكتاب إلى PDF بنجاح!');
            console.log('📁 الملف: كتاب_تعلم_البرمجة_من_الصفر.pdf');
        }
    });
}

// تحويل إلى HTML ثم PDF
function convertToHTMLThenPDF(inputFile) {
    const markdown = fs.readFileSync(inputFile, 'utf8');
    
    // تحويل Markdown إلى HTML بسيط
    let html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>كتاب تعلم البرمجة من الصفر</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin: 30px 0 15px 0;
            font-weight: 600;
        }
        
        h1 {
            font-size: 2.5em;
            text-align: center;
            color: #667eea;
            margin-bottom: 40px;
        }
        
        h2 {
            font-size: 2em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        
        h3 {
            font-size: 1.5em;
            color: #34495e;
        }
        
        p {
            margin: 15px 0;
            text-align: justify;
        }
        
        code {
            background: #f8f9fa;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        pre {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            direction: ltr;
            text-align: left;
        }
        
        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }
        
        ul, ol {
            margin: 15px 0;
            padding-right: 30px;
        }
        
        li {
            margin: 8px 0;
        }
        
        blockquote {
            border-right: 4px solid #667eea;
            padding: 10px 20px;
            margin: 20px 0;
            background: #f8f9fa;
            font-style: italic;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: right;
        }
        
        th {
            background: #667eea;
            color: white;
        }
        
        .highlight {
            background: #fff3cd;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #ffeaa7;
        }
        
        .warning {
            background: #f8d7da;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #f5c6cb;
        }
        
        .success {
            background: #d4edda;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #c3e6cb;
        }
        
        @media print {
            body {
                padding: 20px;
            }
            
            h1 {
                font-size: 2em;
            }
            
            h2 {
                font-size: 1.5em;
            }
        }
    </style>
</head>
<body>
`;

    // تحويل Markdown إلى HTML بسيط
    html += markdown
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        .replace(/^- (.*$)/gim, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^<p>/g, '')
        .replace(/<\/p>$/g, '');

    html += `
</body>
</html>
`;

    // حفظ HTML
    fs.writeFileSync('كتاب_تعلم_البرمجة.html', html, 'utf8');
    console.log('✅ تم إنشاء ملف HTML');
    console.log('📁 الملف: كتاب_تعلم_البرمجة.html');
    console.log('💡 يمكنك فتح الملف في المتصفح وطباعته كـ PDF');
}

// تشغيل التحويل
function main() {
    console.log('📚 بدء تحويل كتاب تعلم البرمجة إلى PDF...');
    
    try {
        const mergedFile = mergeBookFiles();
        convertToPDF(mergedFile);
    } catch (error) {
        console.error('❌ خطأ في تحويل الكتاب:', error.message);
    }
}

// تشغيل السكريبت
if (require.main === module) {
    main();
}

module.exports = { mergeBookFiles, convertToPDF, convertToHTMLThenPDF }; 