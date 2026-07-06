// 数据导入（覆盖式：清空后重建，保留原始 id 以维持关联）

import { type Bookmark, type Category, type Settings } from '../../../shared/types'
import { ensureSchema } from './schema'
import { settingsPatchStatement } from './settings'

export async function importData(
  db: D1Database,
  data: { categories: Category[]; bookmarks: Bookmark[]; settings?: Partial<Settings> },
): Promise<{ categories: number; bookmarks: number; importedCategories: Category[]; importedBookmarks: Bookmark[] }> {
  await ensureSchema(db)
  const now = Date.now()
  const stmts: D1PreparedStatement[] = []
  const importedCategories: Category[] = []
  const importedBookmarks: Bookmark[] = []

  // 先清空（顺序：先书签后分类）
  stmts.push(db.prepare('DELETE FROM bookmarks'))
  stmts.push(db.prepare('DELETE FROM categories'))

  for (const c of data.categories) {
    const category: Category = {
      id: c.id,
      title: c.title,
      icon: c.icon ?? null,
      sort: Number.isFinite(c.sort) ? c.sort : 0,
      created_at: c.created_at || now,
    }
    importedCategories.push(category)
    stmts.push(
      db
        .prepare('INSERT INTO categories (id, title, icon, sort, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(category.id, category.title, category.icon, category.sort, category.created_at),
    )
  }

  for (const b of data.bookmarks) {
    const openMethod = b.open_method === 2 ? 2 : b.open_method === 3 ? 3 : 1
    const bookmark: Bookmark = {
      id: b.id,
      category_id: b.category_id,
      title: b.title,
      url: b.url,
      icon: b.icon ?? null,
      icon_source: (b as unknown as Record<string, Bookmark['icon_source']>).icon_source ?? null,
      icon_background_color: (b as unknown as Record<string, string | null | undefined>).icon_background_color ?? null,
      icon_blob: (b as unknown as Record<string, string | null | undefined>).icon_blob ?? null,
      description: b.description ?? null,
      open_method: openMethod,
      sort: Number.isFinite(b.sort) ? b.sort : 0,
      created_at: b.created_at || now,
    }
    importedBookmarks.push(bookmark)
    stmts.push(
      db
        .prepare(
          'INSERT INTO bookmarks (id, category_id, title, url, icon, icon_source, icon_background_color, icon_blob, description, open_method, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        .bind(
          bookmark.id,
          bookmark.category_id,
          bookmark.title,
          bookmark.url,
          bookmark.icon,
          bookmark.icon_source,
          bookmark.icon_background_color,
          bookmark.icon_blob,
          bookmark.description,
          bookmark.open_method,
          bookmark.sort,
          bookmark.created_at,
        ),
    )
  }

  // 设置（仅写入受支持的 key，绝不触碰 admin_* 等内部 key）
  if (data.settings) {
    const settingsStmt = settingsPatchStatement(db, data.settings)
    if (settingsStmt) stmts.push(settingsStmt)
  }

  await db.batch(stmts)
  importedCategories.sort((a, b) => a.sort - b.sort || a.id - b.id)
  importedBookmarks.sort((a, b) => a.sort - b.sort || a.id - b.id)
  return {
    categories: importedCategories.length,
    bookmarks: importedBookmarks.length,
    importedCategories,
    importedBookmarks,
  }
}
