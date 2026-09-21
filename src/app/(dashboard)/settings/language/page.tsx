import { ControlPlanePage } from "@/components/owneros/control-plane-page"
import { LanguageSettingsPanel } from "@/components/owneros/language-settings-panel"
import { getOwnerOsControlPlanePage } from "@/lib/services/owneros-control-plane.service"

export const dynamic = "force-dynamic"

export default async function SettingsLanguagePage() {
  const model = await getOwnerOsControlPlanePage("settings-language")

  return (
    <ControlPlanePage model={model}>
      <LanguageSettingsPanel />
    </ControlPlanePage>
  )
}
