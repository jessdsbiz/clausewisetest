// Mei, the ClauseWise mascot (original character).
// Usage: element.innerHTML = renderMei({ expression: 'happy', outfit: 'office', holding: 'paper' });
// expression: happy | worried | confused | shocked | thinking | relieved
// outfit:     office (job offer) | casual (rental) | hoodie (phone plan) | smart (loan)
// holding:    none | paper | phone

(function () {
  var EXPRESSIONS = {
    happy:    { browL: 'M70 92 Q78 87 86 92', browR: 'M114 92 Q122 87 130 92', mouth: 'M88 128 Q100 144 112 128 Z', mouthFill: '#C2415D', open: 1, arc: 0, shift: 'translate(0 0)', sweat: 0, q: 0, think: 0, spark: 0 },
    worried:  { browL: 'M70 95 Q78 92 86 87', browR: 'M114 87 Q122 92 130 95', mouth: 'M90 137 Q95 132 100 137 Q105 142 110 137', mouthFill: 'none', open: 1, arc: 0, shift: 'translate(0 2)', sweat: 1, q: 0, think: 0, spark: 0 },
    confused: { browL: 'M70 88 Q78 83 86 88', browR: 'M114 94 L130 92', mouth: 'M92 137 L108 132', mouthFill: 'none', open: 1, arc: 0, shift: 'translate(-2 0)', sweat: 0, q: 1, think: 0, spark: 0 },
    shocked:  { browL: 'M70 85 Q78 79 86 85', browR: 'M114 85 Q122 79 130 85', mouth: 'M100 129 C104 129 106 133 106 137 C106 141 104 145 100 145 C96 145 94 141 94 137 C94 133 96 129 100 129 Z', mouthFill: '#7A2440', open: 1, arc: 0, shift: 'translate(0 0)', sweat: 1, q: 0, think: 0, spark: 0 },
    thinking: { browL: 'M70 92 L86 91', browR: 'M114 88 Q122 83 130 88', mouth: 'M93 135 Q100 133 107 136', mouthFill: 'none', open: 1, arc: 0, shift: 'translate(3 -3)', sweat: 0, q: 0, think: 1, spark: 0 },
    relieved: { browL: 'M70 92 Q78 89 86 93', browR: 'M114 93 Q122 89 130 92', mouth: 'M90 130 Q100 140 110 130', mouthFill: 'none', open: 0, arc: 1, shift: 'translate(0 0)', sweat: 0, q: 0, think: 0, spark: 1 }
  };

  var OUTFITS = {
    office: { top: '#3A2470', sleeve: '#3A2470' },
    casual: { top: '#8B6CF0', sleeve: '#8B6CF0' },
    hoodie: { top: '#5B2BC4', sleeve: '#5B2BC4' },
    smart:  { top: '#5B2BC4', sleeve: '#E6DCFF' }
  };

  function renderMei(opts) {
    opts = opts || {};
    var ex = EXPRESSIONS[opts.expression] ? opts.expression : 'happy';
    var of = OUTFITS[opts.outfit] ? opts.outfit : 'office';
    var hd = opts.holding || 'none';
    var e = EXPRESSIONS[ex];
    var o = OUTFITS[of];
    function op(on) { return on ? '1' : '0'; }

    return '' +
'<svg viewBox="0 0 200 260" style="width:100%;height:auto;display:block" role="img" aria-label="Mei, the ClauseWise SG mascot, looking' + ex + '">' +
  // back hair
  '<path d="M38 100 C36 50 70 28 100 28 C130 28 164 50 162 100 L162 140 C162 152 148 154 145 142 L145 112 L55 112 L55 142 C52 154 38 152 38 140 Z" fill="#2B2140"/>' +
  // body
  '<path d="M60 260 C60 204 76 178 100 178 C124 178 140 204 140 260 Z" fill="' + o.top + '"/>' +
  // smart cardigan
  '<g opacity="' + op(of === 'smart') + '">' +
    '<path d="M60 260 C60 206 74 184 92 180 L98 260 Z" fill="' + o.sleeve + '"/>' +
    '<path d="M140 260 C140 206 126 184 108 180 L102 260 Z" fill="' + o.sleeve + '"/>' +
    '<circle cx="94" cy="214" r="2.6" fill="#B9A6EE"/><circle cx="95" cy="232" r="2.6" fill="#B9A6EE"/>' +
  '</g>' +
  // hoodie
  '<g opacity="' + op(of === 'hoodie') + '">' +
    '<path d="M74 186 Q100 168 126 186 Q100 200 74 186 Z" fill="#4A22A3"/>' +
    '<path d="M94 192 L92 216" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M106 192 L108 216" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none"/>' +
    '<circle cx="92" cy="218" r="2.5" fill="#F7C948"/><circle cx="108" cy="218" r="2.5" fill="#F7C948"/>' +
    '<path d="M80 234 L120 234 L116 252 L84 252 Z" fill="#4A22A3"/>' +
  '</g>' +
  // neck
  '<rect x="92" y="150" width="16" height="32" rx="6" fill="#EFC3A4"/>' +
  // office blazer + lanyard
  '<g opacity="' + op(of === 'office') + '">' +
    '<path d="M88 180 L100 206 L112 180 Z" fill="#FFFFFF"/>' +
    '<path d="M86 180 L100 208 L90 222 Z" fill="#2A1A55"/>' +
    '<path d="M114 180 L100 208 L110 222 Z" fill="#2A1A55"/>' +
    '<path d="M91 182 L100 226 L109 182" stroke="#F7C948" stroke-width="3" fill="none" stroke-linejoin="round"/>' +
    '<rect x="93" y="224" width="14" height="18" rx="3" fill="#FFFFFF" stroke="#F7C948" stroke-width="2"/>' +
    '<rect x="96" y="229" width="8" height="2.5" rx="1" fill="#5B2BC4"/>' +
  '</g>' +
  // casual tee
  '<g opacity="' + op(of === 'casual') + '">' +
    '<path d="M88 180 Q100 196 112 180" stroke="#6A4CD8" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M100 222 C96 216 88 218 90 224 C91 228 100 234 100 234 C100 234 109 228 110 224 C112 218 104 216 100 222 Z" fill="#F7C948"/>' +
  '</g>' +
  // arms
  '<path d="M70 194 C56 204 52 222 56 238" stroke="' + o.sleeve + '" stroke-width="15" stroke-linecap="round" fill="none"/>' +
  '<path d="M130 194 C144 204 148 222 144 238" stroke="' + o.sleeve + '" stroke-width="15" stroke-linecap="round" fill="none"/>' +
  // holding: paper
  '<g opacity="' + op(hd === 'paper') + '"><g transform="rotate(10 150 222)">' +
    '<rect x="130" y="196" width="38" height="50" rx="4" fill="#FFFFFF" stroke="#D9CFF5" stroke-width="2"/>' +
    '<rect x="136" y="204" width="20" height="3" rx="1.5" fill="#5B2BC4"/>' +
    '<rect x="136" y="212" width="26" height="2.5" rx="1.2" fill="#CFC5EA"/>' +
    '<rect x="136" y="219" width="24" height="2.5" rx="1.2" fill="#CFC5EA"/>' +
    '<rect x="136" y="226" width="26" height="2.5" rx="1.2" fill="#CFC5EA"/>' +
    '<rect x="136" y="233" width="14" height="2.5" rx="1.2" fill="#F7C948"/>' +
  '</g></g>' +
  // holding: phone
  '<g opacity="' + op(hd === 'phone') + '">' +
    '<rect x="134" y="204" width="24" height="40" rx="5" fill="#2B2140"/>' +
    '<rect x="137" y="208" width="18" height="30" rx="2.5" fill="#E6DCFF"/>' +
    '<rect x="140" y="213" width="12" height="3" rx="1.5" fill="#5B2BC4"/>' +
    '<rect x="140" y="220" width="10" height="2.5" rx="1.2" fill="#B9A6EE"/>' +
  '</g>' +
  // hands
  '<circle cx="56" cy="240" r="8" fill="#F6D3B8"/><circle cx="144" cy="240" r="8" fill="#F6D3B8"/>' +
  // ears + face
  '<circle cx="43" cy="106" r="9" fill="#F0C7A8"/><circle cx="157" cy="106" r="9" fill="#F0C7A8"/>' +
  '<ellipse cx="100" cy="100" rx="58" ry="55" fill="#F6D3B8"/>' +
  // fringe
  '<path d="M42 96 C42 54 70 34 100 34 C132 34 158 54 158 94 C148 76 128 64 108 66 C98 78 76 88 42 96 Z" fill="#2B2140"/>' +
  // yellow hair clip (signature detail)
  '<g transform="rotate(-22 136 58)">' +
    '<rect x="124" y="53" width="24" height="10" rx="5" fill="#F7C948"/>' +
    '<rect x="128" y="56.5" width="10" height="3" rx="1.5" fill="#FFFFFF" opacity="0.7"/>' +
  '</g>' +
  // eyes open
  '<g opacity="' + e.open + '" transform="' + e.shift + '">' +
    '<ellipse cx="78" cy="110" rx="7.5" ry="9.5" fill="#2B2140"/><ellipse cx="122" cy="110" rx="7.5" ry="9.5" fill="#2B2140"/>' +
    '<circle cx="80.5" cy="106" r="2.8" fill="#FFFFFF"/><circle cx="124.5" cy="106" r="2.8" fill="#FFFFFF"/>' +
  '</g>' +
  // eyes closed (smiling arcs)
  '<g opacity="' + e.arc + '">' +
    '<path d="M70 112 Q78 103 86 112" stroke="#2B2140" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M114 112 Q122 103 130 112" stroke="#2B2140" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
  '</g>' +
  // brows
  '<path d="' + e.browL + '" stroke="#2B2140" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  '<path d="' + e.browR + '" stroke="#2B2140" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  // cheeks
  '<ellipse cx="65" cy="126" rx="9" ry="5" fill="#F29BB0" opacity="0.6"/><ellipse cx="135" cy="126" rx="9" ry="5" fill="#F29BB0" opacity="0.6"/>' +
  // mouth
  '<path d="' + e.mouth + '" fill="' + e.mouthFill + '" stroke="#2B2140" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
  // extras
  '<path d="M154 66 C148 76 148 82 154 82 C160 82 160 76 154 66 Z" fill="#8EC5FF" opacity="' + e.sweat + '"/>' +
  '<text x="160" y="66" font-size="30" font-weight="800" fill="#5B2BC4" opacity="' + e.q + '">?</text>' +
  '<g opacity="' + e.think + '"><circle cx="158" cy="70" r="3" fill="#CFC2F7"/><circle cx="166" cy="57" r="4.5" fill="#CFC2F7"/><circle cx="177" cy="42" r="6.5" fill="#CFC2F7"/></g>' +
  '<path d="M162 52 L165 61 L174 64 L165 67 L162 76 L159 67 L150 64 L159 61 Z" fill="#F7C948" opacity="' + e.spark + '"/>' +
'</svg>';
  }

  window.renderMei = renderMei;
  window.MEI_EXPRESSIONS = Object.keys(EXPRESSIONS);
  window.MEI_OUTFITS = Object.keys(OUTFITS);
})();
