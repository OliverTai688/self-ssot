import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    content = content.replace('import { prisma } from "@/lib/db"', 'import { db as prisma } from "@/lib/db"')
    content = content.replace('(m) =>', '(m: any) =>')
    with open(filepath, 'w') as f:
        f.write(content)

fix_file('src/app/(dashboard)/settings/workspace/page.tsx')
fix_file('src/lib/services/workspace-settings.service.ts')
