import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { getSettings } from '@/common/utils'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { Action } from '@/common/internal-services/db'
import { commands, events } from './bindings'
import { ISettings } from '@/common/types'

const modifierKeys = [
    'OPTION',
    'ALT',
    'CONTROL',
    'CTRL',
    'COMMAND',
    'CMD',
    'SUPER',
    'SHIFT',
    'COMMANDORCONTROL',
    'COMMANDORCTRL',
    'CMDORCTRL',
    'CMDORCONTROL',
]

const isModifierKey = (key: string): boolean => {
    return modifierKeys.includes(key.toUpperCase())
}

export function isMissingNormalKey(hotkey: string): boolean {
    const tokens = hotkey.split('+').map((token) => token.trim().toUpperCase())
    return tokens.every((token) => isModifierKey(token))
}

export async function bindHotkey(oldHotKey?: string) {
    if (oldHotKey && !isMissingNormalKey(oldHotKey) && (await isRegistered(oldHotKey))) {
        await unregister(oldHotKey)
    }
    const settings = await getSettings()
    if (!settings.hotkey) return
    if (isMissingNormalKey(settings.hotkey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${settings.hotkey}`,
        })
        return
    }
    if (await isRegistered(settings.hotkey)) {
        await unregister(settings.hotkey)
    }
    await register(settings.hotkey, () => {
        return commands.showTranslatorWindowWithSelectedTextAndActionCommand('0')
    }).then(() => {
        console.log('register hotkey success')
    })
}

export async function bindDisplayWindowHotkey(oldHotKey?: string) {
    if (oldHotKey && !isMissingNormalKey(oldHotKey) && (await isRegistered(oldHotKey))) {
        await unregister(oldHotKey)
    }
    const settings = await getSettings()
    if (!settings.displayWindowHotkey) {
        return
    }
    if (isMissingNormalKey(settings.displayWindowHotkey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${settings.displayWindowHotkey}`,
        })
        return
    }
    if (await isRegistered(settings.displayWindowHotkey)) {
        await unregister(settings.displayWindowHotkey)
    }
    await register(settings.displayWindowHotkey, () => {
        commands.showTranslatorWindowCommand()
    }).then(() => {
        console.log('register display window hotkey success')
    })
}

export async function bindOCRHotkey(oldOCRHotKey?: string) {
    if (oldOCRHotKey && !isMissingNormalKey(oldOCRHotKey) && (await isRegistered(oldOCRHotKey))) {
        await unregister(oldOCRHotKey)
    }
    const settings = await getSettings()
    if (!settings.ocrHotkey) {
        return
    }
    if (isMissingNormalKey(settings.ocrHotkey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${settings.ocrHotkey}`,
        })
        return
    }
    if (await isRegistered(settings.ocrHotkey)) {
        await unregister(settings.ocrHotkey)
    }
    await register(settings.ocrHotkey, () => {
        return commands.startOcr()
    }).then(() => {
        console.log('OCR hotkey registered')
    })
}

export async function bindWritingHotkey(oldWritingHotKey?: string) {
    if (oldWritingHotKey && !isMissingNormalKey(oldWritingHotKey) && (await isRegistered(oldWritingHotKey))) {
        await unregister(oldWritingHotKey)
    }
    const settings = await getSettings()
    if (!settings.writingHotkey) return
    if (isMissingNormalKey(settings.writingHotkey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${settings.writingHotkey}`,
        })
        return
    }
    if (await isRegistered(settings.writingHotkey)) {
        await unregister(settings.writingHotkey)
    }
    await register(settings.writingHotkey, () => {
        return commands.writingCommand()
    }).then(() => {
        console.log('writing hotkey registered')
    })
}

export async function bindActionHotkey(action: Action, oldActionHotKey?: string) {
    if (oldActionHotKey && !isMissingNormalKey(oldActionHotKey) && (await isRegistered(oldActionHotKey))) {
        await unregister(oldActionHotKey)
    }
    const newActionHotKey = action.hotkey
    if (!newActionHotKey) return
    if (isMissingNormalKey(newActionHotKey)) {
        sendNotification({
            title: 'Cannot bind hotkey',
            body: `Hotkey must contain at least one normal key: ${newActionHotKey}`,
        })
        return
    }
    if (await isRegistered(newActionHotKey)) {
        await unregister(newActionHotKey)
    }
    await register(newActionHotKey, () => {
        return commands.showTranslatorWindowWithSelectedTextAndActionCommand(action.id?.toString() || '0')
    }).then(() => {
        console.log('action hotkey registered')
    })
}

export function onSettingsSave(oldSettings: ISettings, latestSettings: ISettings) {
    if (latestSettings.i18n !== oldSettings.i18n) {
        commands.updateLocales(latestSettings.i18n || 'en')
    }
    events.configUpdatedEvent.emit()
    bindHotkey(oldSettings.hotkey)
    bindDisplayWindowHotkey(oldSettings.displayWindowHotkey)
    bindOCRHotkey(oldSettings.ocrHotkey)
    bindWritingHotkey(oldSettings.writingHotkey)
}
