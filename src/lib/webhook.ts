export interface WebhookPayload {
  event: 'submission.created'
  submissionId: number
  formName: string
  companyName?: string
  siteName?: string
  siteDomain?: string
  data: Record<string, string>
  meta: {
    ip?: string
    country?: string
    city?: string
    pageUrl?: string
    utmSource?: string
    utmKeyword?: string
    createdAt: string
  }
}

// Dispatch to Feishu Interactive Card
export async function sendFeishuWebhook(url: string, payload: WebhookPayload) {
  try {
    const fieldsText = Object.entries(payload.data)
      .map(([k, v]) => `**${k}**: ${v || '-'}`)
      .join('\n')

    const body = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { tag: 'plain_text', content: `📋 新询盘通知 - ${payload.formName}` },
          template: 'blue'
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**归属公司**: ${payload.companyName || '通用'}\n**独立站**: ${payload.siteName || '通用'} (${payload.siteDomain || '-'})\n**提交时间**: ${payload.meta.createdAt}`
            }
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `### 📝 表单数据\n${fieldsText}`
            }
          },
          { tag: 'hr' },
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: `**来源渠道**: ${payload.meta.utmSource || '-'}\n**关键词**: ${payload.meta.utmKeyword || '-'}\n**来源页面**: ${payload.meta.pageUrl || '-'}\n**IP / 地区**: ${payload.meta.ip || '-'} ${payload.meta.city || ''} ${payload.meta.country || ''}`
            }
          }
        ]
      }
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.error('Feishu webhook dispatch error:', err)
  }
}

// Dispatch to DingTalk Webhook Card
export async function sendDingtalkWebhook(url: string, payload: WebhookPayload) {
  try {
    const fieldsText = Object.entries(payload.data)
      .map(([k, v]) => `- **${k}**: ${v || '-'}`)
      .join('\n')

    const body = {
      msgtype: 'markdown',
      markdown: {
        title: `新询盘 - ${payload.formName}`,
        text: `### 📋 收到新询盘通知 - ${payload.formName}\n` +
          `- **归属公司**: ${payload.companyName || '通用'}\n` +
          `- **独立站**: ${payload.siteName || '通用'}\n` +
          `- **提交时间**: ${payload.meta.createdAt}\n\n` +
          `#### 📝 详细数据:\n${fieldsText}\n\n` +
          `> 来源页面: ${payload.meta.pageUrl || '-'}\n` +
          `> 渠道/关键词: ${payload.meta.utmSource || '-'} / ${payload.meta.utmKeyword || '-'}\n` +
          `> IP: ${payload.meta.ip || '-'}`
      }
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch (err) {
    console.error('Dingtalk webhook dispatch error:', err)
  }
}

// Dispatch Custom JSON Webhook Endpoint
export async function sendCustomWebhook(url: string, payload: WebhookPayload) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.error('Custom webhook dispatch error:', err)
  }
}

// Unified Webhook Resolver & Dispatcher
export async function dispatchWebhooks(
  companyWebhooks?: { feishu?: string | null; dingtalk?: string | null; custom?: string | null },
  siteWebhooks?: { feishu?: string | null; dingtalk?: string | null; custom?: string | null },
  payload?: WebhookPayload
) {
  if (!payload) return

  const feishuUrl = siteWebhooks?.feishu || companyWebhooks?.feishu
  const dingtalkUrl = siteWebhooks?.dingtalk || companyWebhooks?.dingtalk
  const customUrl = siteWebhooks?.custom || companyWebhooks?.custom

  const tasks: Promise<any>[] = []

  if (feishuUrl) tasks.push(sendFeishuWebhook(feishuUrl, payload))
  if (dingtalkUrl) tasks.push(sendDingtalkWebhook(dingtalkUrl, payload))
  if (customUrl) tasks.push(sendCustomWebhook(customUrl, payload))

  if (tasks.length > 0) {
    await Promise.allSettled(tasks)
  }
}
