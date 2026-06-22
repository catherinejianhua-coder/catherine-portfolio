// Cherish Core - static-friendly client.
// It uses the API when available and falls back to a deterministic local flow.
(function(root, factory){
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CherishCore = factory();
})(this, function(){

  async function chatPipeline(messages, currentStage){
    const history = Array.isArray(messages) ? messages : [];

    // Empty history -> welcome, no server call needed
    if (!history.length) {
      return {
        action: 'showWelcome', stage: 'welcome',
        text: 'Tell me what happened. I will help you sort out what matters, then draft words you can actually send.',
        quickScenarios: getQuickScenarios()
      };
    }

    // API path for a live deployment with a backend.
    try {
      const body = JSON.stringify({ messages: history, stage: currentStage || '' });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });
      const data = await res.json();
      if (data && !data.error) return normalizeResult(data);
    } catch(e) {}

    return localPipeline(history, currentStage);
  }

  function getQuickScenarios(){
    return [
      { id:'birthday', icon:'🎂', label:'Forgotten birthday / anniversary', placeholder:'They forgot my birthday and I feel really disappointed...' },
      { id:'repeated', icon:'🔄', label:'A repeated issue is ignored', placeholder:'I have brought up the same thing many times, but it still feels like it does not matter to them...' },
      { id:'coldwar', icon:'🧊', label:'Cold silence / not wanting to give in first', placeholder:'We have not spoken properly for days. I do not want things to stay frozen, but I also do not want to sound like I am surrendering...' },
      { id:'breakup', icon:'💔', label:'Breakup / someone pulling away', placeholder:'They said they might leave, and I do not know what to do...' },
      { id:'generic', icon:'✍️', label:'Something else', placeholder:'Describe what happened...' }
    ];
  }

  function localPipeline(history, currentStage){
    const lastUser = [...history].reverse().find(m => m.role === 'user');
    const text = (lastUser && lastUser.content || '').trim();
    if (isSelection(text) || currentStage === 'compose') return composeFromSelection(history, text);
    return {
      action: 'showOptions',
      stage: 'options',
      hint: buildHint(text),
      choices: [
        { value:'feeling', text:'Name the feeling without blaming: "I felt hurt and distant when this happened."' },
        { value:'need', text:'State the need clearly: "I need us to talk about this instead of pretending it is fine."' },
        { value:'boundary', text:'Set a calm boundary: "I can talk when we both stay respectful."' },
        { value:'action', text:'Ask for a small next step: "Could we talk for ten minutes tonight?"' }
      ]
    };
  }

  function composeFromSelection(history, selectionText){
    const firstUser = history.find(m => m.role === 'user' && !isSelection(m.content));
    const context = ((firstUser && firstUser.content) || '').replace(/\s+/g, ' ').trim();
    const selected = new Set(String(selectionText || '').split(/[;；]/).map(s => s.trim()).filter(Boolean));
    const lines = [];
    lines.push('I want to say this carefully, because I care about us and I do not want this to turn into another argument.');
    if (selected.has('feeling')) lines.push('When this happened, I felt hurt and a bit alone. I may not have said it well in the moment, but it did matter to me.');
    if (selected.has('need')) lines.push('What I need is not a perfect answer. I need us to acknowledge what happened and make room for an honest conversation.');
    if (selected.has('boundary')) lines.push('I can talk about this calmly, but I do not want either of us to dismiss, punish, or keep score.');
    if (selected.has('action') || !selected.size) lines.push('Could we set aside ten minutes today and talk about it without trying to win?');
    if (context && context.length < 180) lines.push(`For context: ${context}`);
    return {
      action: 'showCompose',
      stage: 'compose',
      draft: lines.join('\n\n'),
      note: 'Edit the wording so it sounds like you. Cherish gives you a starting point, not a verdict.'
    };
  }

  function buildHint(text){
    const lower = String(text || '').toLowerCase();
    if (lower.includes('birthday') || lower.includes('anniversary')) {
      return 'This sounds less about the date itself and more about wanting to feel remembered. Choose the parts you want the message to carry.';
    }
    if (lower.includes('silent') || lower.includes('cold') || lower.includes('spoken')) {
      return 'The core tension seems to be wanting reconnection without feeling like you are giving up your dignity.';
    }
    if (lower.includes('leave') || lower.includes('break')) {
      return 'This is emotionally high-stakes. A useful message should slow the situation down before trying to solve everything.';
    }
    return 'I will separate the situation from the message. Choose what the draft should emphasize.';
  }

  function isSelection(text){
    return /^(feeling|need|boundary|action)([;；](feeling|need|boundary|action))*$/.test(String(text || '').trim());
  }

  function normalizeResult(data){
    if (!data || typeof data !== 'object') return data;
    return data;
  }

  return { chatPipeline, getQuickScenarios };
});
