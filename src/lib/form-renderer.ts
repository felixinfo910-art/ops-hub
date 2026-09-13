export interface FormField {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'file'
  placeholder?: string
  required: boolean
  options?: string[] // for select
  width?: 'full' | 'half' // layout
}

const themes = {
  default: {
    bg: '#f8f9fb',
    formBg: '#ffffff',
    primary: '#2563eb',
    text: '#111827',
    label: '#374151',
    border: '#d1d5db',
    inputBg: '#ffffff',
    btnText: '#ffffff',
    btnBg: '#2563eb',
    btnHover: '#1d4ed8',
    radius: '8px',
    font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  dark: {
    bg: '#0f172a',
    formBg: '#1e293b',
    primary: '#6366f1',
    text: '#f1f5f9',
    label: '#cbd5e1',
    border: '#334155',
    inputBg: '#0f172a',
    btnText: '#ffffff',
    btnBg: '#6366f1',
    btnHover: '#4f46e5',
    radius: '8px',
    font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  minimal: {
    bg: '#ffffff',
    formBg: '#ffffff',
    primary: '#18181b',
    text: '#18181b',
    label: '#3f3f46',
    border: '#e4e4e7',
    inputBg: '#fafafa',
    btnText: '#ffffff',
    btnBg: '#18181b',
    btnHover: '#27272a',
    radius: '4px',
    font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
}

export function renderFormHTML(
  formId: number,
  formName: string,
  fields: FormField[],
  successMessage: string,
  theme: keyof typeof themes = 'default',
  submitEndpoint: string
): string {
  const t = themes[theme] || themes.default

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
.ops-form-wrap{font-family:${t.font};background:${t.bg};padding:32px 24px;border-radius:12px;}
.ops-form{background:${t.formBg};padding:32px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 1px 2px rgba(0,0,0,.04);}
.ops-form-title{font-size:20px;font-weight:700;color:${t.text};margin-bottom:24px;}
.ops-fields{display:flex;flex-wrap:wrap;gap:16px;}
.ops-field{display:flex;flex-direction:column;gap:6px;}
.ops-label{font-size:14px;font-weight:500;color:${t.label};}
.ops-input{width:100%;padding:10px 14px;border:1px solid ${t.border};border-radius:${t.radius};font-size:14px;color:${t.text};background:${t.inputBg};outline:none;transition:border-color .15s,box-shadow .15s;font-family:${t.font};}
.ops-input:focus{border-color:${t.primary};box-shadow:0 0 0 3px ${t.primary}22;}
.ops-textarea{resize:vertical;min-height:110px;}
.ops-select{cursor:pointer;}
.ops-file{padding:8px 14px;cursor:pointer;}
.ops-submit-wrap{margin-top:24px;}
.ops-submit{width:100%;padding:12px 24px;background:${t.btnBg};color:${t.btnText};border:none;border-radius:${t.radius};font-size:15px;font-weight:600;cursor:pointer;transition:background .15s,transform .1s;font-family:${t.font};}
.ops-submit:hover{background:${t.btnHover};transform:translateY(-1px);}
.ops-submit:active{transform:translateY(0);}
.ops-submit:disabled{opacity:.6;cursor:not-allowed;transform:none;}
.ops-msg{margin-top:16px;padding:14px 16px;border-radius:${t.radius};font-size:14px;display:none;}
.ops-msg.success{background:#d1fae5;color:#065f46;display:block;}
.ops-msg.error{background:#fee2e2;color:#991b1b;display:block;}
@media(max-width:640px){.ops-field{width:100%!important;}.ops-form{padding:20px;}}
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
      <button type="submit" class="ops-submit" id="ops_btn_${formId}">Submit 提交</button>
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
      btn.textContent = 'Submit 提交';
    });
  });
})();
</script>`
}
