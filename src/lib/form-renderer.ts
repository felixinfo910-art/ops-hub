export interface FormField {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'file'
  placeholder?: string
  required: boolean
  options?: string[] // for select
  width?: 'full' | 'half' // layout
}

export interface FormStyleConfig {
  btnBg?: string
  btnText?: string
  btnRadius?: string
  btnTextLabel?: string
  btnFontSize?: string
  inputRadius?: string
  inputBg?: string
  inputFontSize?: string
  labelColor?: string
  labelFontSize?: string
  labelFontWeight?: string
  formBg?: string
}

const themes = {
  default: {
    bg: 'transparent',
    formBg: 'transparent',
    primary: '#00563b',
    text: '#111827',
    label: '#111827',
    labelFontSize: '14px',
    labelFontWeight: '500',
    border: 'rgba(0,0,0,0.08)',
    inputBg: '#ffffff',
    inputRadius: '9999px',
    inputFontSize: '14px',
    textareaRadius: '20px',
    btnText: '#ffffff',
    btnBg: '#00563b',
    btnHover: '#00442e',
    btnRadius: '9999px',
    btnFontSize: '15px',
    btnTextLabel: 'Submit 提交',
    font: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  green: {
    bg: 'transparent',
    formBg: 'transparent',
    primary: '#00563b',
    text: '#111827',
    label: '#111827',
    labelFontSize: '14px',
    labelFontWeight: '500',
    border: 'rgba(0,0,0,0.08)',
    inputBg: '#ffffff',
    inputRadius: '9999px',
    inputFontSize: '14px',
    textareaRadius: '20px',
    btnText: '#ffffff',
    btnBg: '#00563b',
    btnHover: '#00442e',
    btnRadius: '9999px',
    btnFontSize: '15px',
    btnTextLabel: 'Submit 提交',
    font: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  dark: {
    bg: 'transparent',
    formBg: '#1e293b',
    primary: '#6366f1',
    text: '#f1f5f9',
    label: '#cbd5e1',
    labelFontSize: '14px',
    labelFontWeight: '500',
    border: '#334155',
    inputBg: '#0f172a',
    inputRadius: '12px',
    inputFontSize: '14px',
    textareaRadius: '12px',
    btnText: '#ffffff',
    btnBg: '#6366f1',
    btnHover: '#4f46e5',
    btnRadius: '9999px',
    btnFontSize: '15px',
    btnTextLabel: 'Submit 提交',
    font: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  minimal: {
    bg: 'transparent',
    formBg: '#ffffff',
    primary: '#18181b',
    text: '#18181b',
    label: '#3f3f46',
    labelFontSize: '14px',
    labelFontWeight: '500',
    border: '#e4e4e7',
    inputBg: '#fafafa',
    inputRadius: '8px',
    inputFontSize: '14px',
    textareaRadius: '8px',
    btnText: '#ffffff',
    btnBg: '#18181b',
    btnHover: '#27272a',
    btnRadius: '8px',
    btnFontSize: '15px',
    btnTextLabel: 'Submit',
    font: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
}

export function renderFormHTML(
  formId: number,
  formName: string,
  fields: FormField[],
  successMessage: string,
  theme: keyof typeof themes = 'default',
  submitEndpoint: string,
  styleConfigRaw?: string | FormStyleConfig | null,
  customCss?: string | null
): string {
  const baseT = themes[theme] || themes.default

  let customCfg: FormStyleConfig = {}
  if (styleConfigRaw) {
    if (typeof styleConfigRaw === 'string') {
      try { customCfg = JSON.parse(styleConfigRaw) } catch {}
    } else {
      customCfg = styleConfigRaw
    }
  }

  const t = {
    ...baseT,
    bg: customCfg.formBg || baseT.bg,
    formBg: customCfg.formBg || baseT.formBg,
    primary: customCfg.btnBg || baseT.primary,
    label: customCfg.labelColor || baseT.label,
    labelFontSize: customCfg.labelFontSize || baseT.labelFontSize,
    labelFontWeight: customCfg.labelFontWeight || baseT.labelFontWeight,
    inputBg: customCfg.inputBg || baseT.inputBg,
    inputRadius: customCfg.inputRadius || baseT.inputRadius,
    inputFontSize: customCfg.inputFontSize || baseT.inputFontSize,
    textareaRadius: customCfg.inputRadius === '9999px' ? '20px' : (customCfg.inputRadius || baseT.textareaRadius),
    btnText: customCfg.btnText || baseT.btnText,
    btnBg: customCfg.btnBg || baseT.btnBg,
    btnHover: customCfg.btnBg || baseT.btnHover,
    btnRadius: customCfg.btnRadius || baseT.btnRadius,
    btnFontSize: customCfg.btnFontSize || baseT.btnFontSize,
    btnTextLabel: customCfg.btnTextLabel || baseT.btnTextLabel,
  }

  const renderField = (field: FormField): string => {
    const widthStyle = field.width === 'half' ? 'width:calc(50% - 8px);' : 'width:100%;'

    if (field.type === 'textarea') {
      return `
        <div class="ops-field" style="${widthStyle}">
          <label class="ops-label" for="ops_${field.id}">${field.label}${field.required ? ' <span style="color:#ef4444;">*</span>' : ''}</label>
          <textarea class="ops-input ops-textarea" id="ops_${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} rows="4"></textarea>
        </div>`
    }
    if (field.type === 'select' && field.options) {
      const optionsHtml = field.options.map(o => `<option value="${o}">${o}</option>`).join('')
      return `
        <div class="ops-field" style="${widthStyle}">
          <label class="ops-label" for="ops_${field.id}">${field.label}${field.required ? ' <span style="color:#ef4444;">*</span>' : ''}</label>
          <select class="ops-input ops-select" id="ops_${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
            <option value="">-- Please select --</option>
            ${optionsHtml}
          </select>
        </div>`
    }
    if (field.type === 'file') {
      return `
        <div class="ops-field" style="${widthStyle}">
          <label class="ops-label" for="ops_${field.id}">${field.label}${field.required ? ' <span style="color:#ef4444;">*</span>' : ''}</label>
          <input class="ops-input ops-file" id="ops_${field.id}" name="${field.id}" type="file" ${field.required ? 'required' : ''} />
        </div>`
    }
    return `
      <div class="ops-field" style="${widthStyle}">
        <label class="ops-label" for="ops_${field.id}">${field.label}${field.required ? ' <span style="color:#ef4444;">*</span>' : ''}</label>
        <input class="ops-input" id="ops_${field.id}" name="${field.id}" type="${field.type}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} />
      </div>`
  }

  const fieldsHtml = fields.map(renderField).join('\n')

  return `
<style>
.ops-form-wrap *{box-sizing:border-box;margin:0;padding:0;}
.ops-form-wrap{font-family:${t.font};background:${t.bg};padding:0;}
.ops-form{background:${t.formBg};padding:0;}
.ops-form-title{font-size:20px;font-weight:700;color:${t.text};margin-bottom:24px;}
.ops-fields{display:flex;flex-wrap:wrap;gap:16px;}
.ops-field{display:flex;flex-direction:column;gap:8px;}
.ops-label{font-size:${t.labelFontSize};font-weight:${t.labelFontWeight};color:${t.label};}
.ops-input{width:100%;padding:14px 24px;border:1px solid ${t.border};border-radius:${t.inputRadius};font-size:${t.inputFontSize};color:${t.text};background:${t.inputBg};outline:none;transition:border-color .15s,box-shadow .15s;font-family:${t.font};box-shadow:0 1px 3px rgba(0,0,0,.02);}
.ops-input:focus{border-color:${t.primary};box-shadow:0 0 0 3px ${t.primary}22;}
.ops-textarea{border-radius:${t.textareaRadius};resize:vertical;min-height:120px;padding:16px 20px;}
.ops-select{cursor:pointer;border-radius:${t.inputRadius};}
.ops-file{padding:10px 18px;cursor:pointer;border-radius:${t.inputRadius};}
.ops-submit-wrap{margin-top:24px;}
.ops-submit{width:100%;padding:14px 28px;background:${t.btnBg};color:${t.btnText};border:none;border-radius:${t.btnRadius};font-size:${t.btnFontSize};font-weight:600;cursor:pointer;transition:all .2s ease;font-family:${t.font};box-shadow:0 4px 12px rgba(0,86,59,.15);}
.ops-submit:hover{background:${t.btnHover};opacity:0.92;transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,86,59,.25);}
.ops-submit:active{transform:translateY(0);}
.ops-submit:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.ops-msg{margin-top:16px;padding:14px 18px;border-radius:12px;font-size:14px;display:none;}
.ops-msg.success{background:#d1fae5;color:#065f46;display:block;}
.ops-msg.error{background:#fee2e2;color:#991b1b;display:block;}
@media(max-width:640px){.ops-field{width:100%!important;}}
${customCss || ''}
</style>

<div class="ops-form-wrap" id="ops_wrap_${formId}">
  <form class="ops-form" id="ops_form_${formId}" novalidate>
    <input type="hidden" name="form_id" value="${formId}" />
    <input type="hidden" name="page_url" id="ops_page_url_${formId}" value="" />
    <input type="hidden" name="referrer" id="ops_referrer_${formId}" value="" />
    <input type="hidden" name="utm_source" id="ops_utm_source_${formId}" value="" />
    <input type="hidden" name="utm_medium" id="ops_utm_medium_${formId}" value="" />
    <input type="hidden" name="utm_campaign" id="ops_utm_campaign_${formId}" value="" />
    <input type="hidden" name="utm_keyword" id="ops_utm_keyword_${formId}" value="" />
    <div class="ops-fields">
      ${fieldsHtml}
    </div>
    <div class="ops-submit-wrap">
      <button type="submit" class="ops-submit" id="ops_btn_${formId}">${t.btnTextLabel}</button>
    </div>
    <div class="ops-msg" id="ops_msg_${formId}"></div>
  </form>
</div>

<script>
(function(){
  var formEl = document.getElementById('ops_form_${formId}');
  var btn = document.getElementById('ops_btn_${formId}');
  var msg = document.getElementById('ops_msg_${formId}');
  var pageUrlEl = document.getElementById('ops_page_url_${formId}');
  var referrerEl = document.getElementById('ops_referrer_${formId}');
  var utmSourceEl = document.getElementById('ops_utm_source_${formId}');
  var utmMediumEl = document.getElementById('ops_utm_medium_${formId}');
  var utmCampaignEl = document.getElementById('ops_utm_campaign_${formId}');
  var utmKeywordEl = document.getElementById('ops_utm_keyword_${formId}');

  // Fill tracking info
  try {
    pageUrlEl.value = window.location.href;
    referrerEl.value = document.referrer;
    var params = new URLSearchParams(window.location.search);
    utmSourceEl.value = params.get('utm_source') || '';
    utmMediumEl.value = params.get('utm_medium') || '';
    utmCampaignEl.value = params.get('utm_campaign') || '';
    utmKeywordEl.value = params.get('keyword') || params.get('utm_term') || (function(){
      var k = localStorage.getItem('infility-global_infility-form_keyword');
      return k || '';
    })();
  } catch(e) {}

  formEl.addEventListener('submit', function(e){
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Sending...';
    msg.className = 'ops-msg';
    msg.style.display = 'none';

    var data = {};
    var inputs = formEl.querySelectorAll('input,textarea,select');
    inputs.forEach(function(el){
      if(el.name && el.type !== 'file') data[el.name] = el.value;
    });

    fetch('${submitEndpoint}', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    })
    .then(function(r){ return r.json(); })
    .then(function(res){
      if(res.success){
        msg.className = 'ops-msg success';
        msg.textContent = '${successMessage}';
        msg.style.display = 'block';
        formEl.reset();
      } else {
        msg.className = 'ops-msg error';
        msg.textContent = res.message || 'Something went wrong. Please try again.';
        msg.style.display = 'block';
      }
    })
    .catch(function(){
      msg.className = 'ops-msg error';
      msg.textContent = 'Network error. Please try again.';
      msg.style.display = 'block';
    })
    .finally(function(){
      btn.disabled = false;
      btn.textContent = '${t.btnTextLabel}';
    });
  });
})();
</script>`
}
