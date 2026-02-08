'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

export default function MarketerEasyOrdersGuidePage() {
  const router = useRouter();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch markdown content from API
    fetch('/api/docs/marketer-easy-orders-guide.md')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to load guide');
        }
        return res.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading guide:', error);
        setContent('# دليل المسوق: ربط Easy Orders\n\nعذراً، لم يتم العثور على الدليل.');
        setLoading(false);
      });
  }, []);

  // Enhanced markdown to HTML converter
  const markdownToHtml = (md: string) => {
    if (!md) return '';
    
    let html = md;
    
    // Preserve emojis and images before escaping
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF]+|[\u2600-\u26FF]|[\u2700-\u27BF]/g;
    
    // First, escape all HTML to prevent XSS and preserve raw markdown
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Code blocks (must be processed first, before unescaping)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, (match, lang, code) => {
      // Unescape code content
      const unescaped = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      return `<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto my-4 border border-gray-200 dark:border-gray-700"><code class="text-sm font-mono whitespace-pre">${unescaped}</code></pre>`;
    });
    
    // Inline code
    html = html.replace(/`([^`\n]+)`/gim, (match, code) => {
      const unescaped = code
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      return `<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">${unescaped}</code>`;
    });
    
    // Headers (process from largest to smallest, only at start of line)
    html = html.replace(/^#### (.+)$/gim, '<h4 class="text-lg font-bold mt-5 mb-2 text-gray-900 dark:text-white">$1</h4>');
    html = html.replace(/^### (.+)$/gim, '<h3 class="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white">$1</h3>');
    html = html.replace(/^## (.+)$/gim, '<h2 class="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">$1</h2>');
    html = html.replace(/^# (.+)$/gim, '<h1 class="text-3xl font-bold mt-10 mb-5 text-gray-900 dark:text-white">$1</h1>');
    
    // Horizontal rules (must be on its own line)
    html = html.replace(/^---$/gim, '<hr class="my-6 border-gray-300 dark:border-gray-600">');
    
    // Bold and italic (process bold first, then italic)
    html = html.replace(/\*\*\*(.+?)\*\*\*/gim, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/gim, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>');
    html = html.replace(/\*(.+?)\*/gim, '<em class="italic">$1</em>');
    
    // Images (before links, as images use similar syntax)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, (match, alt, src) => {
      const unescapedAlt = alt
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      return `<img src="${src}" alt="${unescapedAlt || ''}" class="max-w-full h-auto rounded-lg my-4 shadow-md" />`;
    });
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline">$1</a>');
    
    // Process lists - handle nested lists and numbered lists
    const lines = html.split('\n');
    const processedLines: string[] = [];
    let inUnorderedList = false;
    let inOrderedList = false;
    let listItems: string[] = [];
    let listLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check for unordered list item
      const unorderedMatch = trimmed.match(/^[\*\-\+] (.+)$/);
      // Check for ordered list item
      const orderedMatch = trimmed.match(/^\d+\. (.+)$/);
      
      if (unorderedMatch) {
        if (!inUnorderedList) {
          // Close previous list if exists
          if (inOrderedList && listItems.length > 0) {
            processedLines.push(`<ol class="list-decimal list-inside mb-4 space-y-2 mr-4">${listItems.join('')}</ol>`);
            listItems = [];
            inOrderedList = false;
          }
          inUnorderedList = true;
          listItems = [];
        }
        listItems.push(`<li class="mb-2 text-gray-700 dark:text-gray-300">${unorderedMatch[1]}</li>`);
      } else if (orderedMatch) {
        if (!inOrderedList) {
          // Close previous list if exists
          if (inUnorderedList && listItems.length > 0) {
            processedLines.push(`<ul class="list-disc list-inside mb-4 space-y-2 mr-4">${listItems.join('')}</ul>`);
            listItems = [];
            inUnorderedList = false;
          }
          inOrderedList = true;
          listItems = [];
        }
        listItems.push(`<li class="mb-2 text-gray-700 dark:text-gray-300">${orderedMatch[1]}</li>`);
      } else {
        // Not a list item - close any open list
        if (inUnorderedList && listItems.length > 0) {
          processedLines.push(`<ul class="list-disc list-inside mb-4 space-y-2 mr-4">${listItems.join('')}</ul>`);
          listItems = [];
          inUnorderedList = false;
        }
        if (inOrderedList && listItems.length > 0) {
          processedLines.push(`<ol class="list-decimal list-inside mb-4 space-y-2 mr-4">${listItems.join('')}</ol>`);
          listItems = [];
          inOrderedList = false;
        }
        processedLines.push(line);
      }
    }
    
    // Close any remaining open list
    if (inUnorderedList && listItems.length > 0) {
      processedLines.push(`<ul class="list-disc list-inside mb-4 space-y-2 mr-4">${listItems.join('')}</ul>`);
    }
    if (inOrderedList && listItems.length > 0) {
      processedLines.push(`<ol class="list-decimal list-inside mb-4 space-y-2 mr-4">${listItems.join('')}</ol>`);
    }
    
    html = processedLines.join('\n');
    
    // Process paragraphs - split by double newlines
    const blocks = html.split(/\n\n+/);
    html = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      
      // Skip if already processed (headers, lists, HR, code blocks)
      if (
        trimmed.match(/^<h[1-6]/) ||
        trimmed.match(/^<ul/) ||
        trimmed.match(/^<ol/) ||
        trimmed.match(/^<li/) ||
        trimmed.match(/^<hr/) ||
        trimmed.match(/^<pre/) ||
        trimmed.match(/^<code/)
      ) {
        return trimmed;
      }
      
      // Unescape HTML entities for paragraphs (but keep code blocks escaped)
      const unescaped = trimmed
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      return `<p class="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">${unescaped}</p>`;
    }).filter(Boolean).join('\n');
    
    // Process tables
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      // Check if this is part of a table (has multiple pipe-separated cells)
      const cells = content.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
      if (cells.length > 1) {
        // This is a table row
        const isHeader = match.includes('---') || match.includes('|--');
        if (isHeader) {
          return '<thead><tr>' + cells.map((cell: string) => {
            const unescaped = cell.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            return `<th class="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 font-bold text-right">${unescaped}</th>`;
          }).join('') + '</tr></thead>';
        } else {
          return '<tr>' + cells.map((cell: string) => {
            const unescaped = cell.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            return `<td class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-right">${unescaped}</td>`;
          }).join('') + '</tr>';
        }
      }
      return match;
    });
    
    // Wrap consecutive table rows in table tags
    html = html.replace(/(<thead>[\s\S]*?<\/thead>|<tr>[\s\S]*?<\/tr>)/g, (match) => {
      if (match.includes('<table')) return match; // Already wrapped
      return `<table class="min-w-full border-collapse border border-gray-300 dark:border-gray-600 my-4">${match}</table>`;
    });
    
    // Fix table structure - ensure proper wrapping
    html = html.replace(/(<table[^>]*>)([\s\S]*?)(<\/table>)/g, (match, open, content, close) => {
      if (!content.includes('<tbody') && !content.includes('<thead')) {
        // Wrap rows in tbody if not already wrapped
        const rows = content.match(/<tr>[\s\S]*?<\/tr>/g) || [];
        const headerRows = rows.filter((r: string) => r.includes('<th'));
        const bodyRows = rows.filter((r: string) => !r.includes('<th'));
        
        let result = open;
        if (headerRows.length > 0) {
          result += '<thead>' + headerRows.join('') + '</thead>';
        }
        if (bodyRows.length > 0) {
          result += '<tbody>' + bodyRows.join('') + '</tbody>';
        }
        result += close;
        return result;
      }
      return match;
    });
    
    // Unescape emojis (they should display as-is)
    // Emojis are already preserved, no need to unescape them
    
    return html;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              دليل المسوق: ربط Easy Orders
            </h1>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">إغلاق</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">جاري تحميل الدليل...</p>
          </div>
        ) : (
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sm:p-8"
            dir="rtl"
          >
            <div 
              className="prose prose-lg dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
            />
          </div>
        )}
        
        {/* Back to integrations */}
        <div className="mt-8 text-center">
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة إلى صفحة التكاملات
          </Link>
        </div>
      </div>
    </div>
  );
}
