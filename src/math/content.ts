/**
 * Converts legacy math-looking fragments into the app's explicit delimiter
 * convention. Authored JSON is migrated with this helper once; generated
 * calculation/guided strings also pass through it because their numeric branch
 * is selected at runtime. Static authored registries still go through the
 * validator, so new malformed prose is reported rather than silently fixed.
 */
const NORMALIZATION_CACHE_LIMIT = 4096;
const normalizationCache = new Map<string, string>();

export function normalizeLegacyMathText(text: string): string {
  const cached = normalizationCache.get(text);
  if (cached !== undefined || normalizationCache.has(text)) return cached ?? "";

  const protectedFragments: string[] = [];
  const protectMath = (value: string): string =>
    value.replace(/\\\(([^]*?)\\\)|\\\[([^]*?)\\\]/gu, (full, inline, display) => {
      const placeholder = `\uE000${String.fromCodePoint(0xe100 + protectedFragments.length)}\uE001`;
      const open = display === undefined ? "\\(" : "\\[";
      const close = display === undefined ? "\\)" : "\\]";
      const expression = (inline ?? display ?? "").replace(/(?<!\\)\$/gu, "\\$");
      protectedFragments.push(`${open}${expression}${close}`);
      return placeholder;
    });

  let normalized = protectMath(
    repairMixedMathFragments(protectCorruptPlaceholder(text)),
  );
  normalized = replaceKnownFormulas(normalized);
  normalized = protectMath(normalized);
  normalized = repairMixedMathFragments(wrapEquationClauses(normalized));
  normalized = protectMath(normalized);
  normalized = repairMixedMathFragments(wrapLegacyMathTokens(normalized));
  normalized = protectMath(normalized);

  const restored = normalized.replace(
    /\uE000([\uE100-\uE1FF])\uE001/gu,
    (_, marker: string) => protectedFragments[marker.codePointAt(0)! - 0xe100],
  );
  const result = repairSplitMathBoundaries(restored);
  if (normalizationCache.size >= NORMALIZATION_CACHE_LIMIT) {
    const oldest = normalizationCache.keys().next().value;
    if (oldest !== undefined) normalizationCache.delete(oldest);
  }
  normalizationCache.set(text, result);
  return result;
}

function protectCorruptPlaceholder(text: string): string {
  const nul = String.fromCharCode(0);
  return text
    .replaceAll("\t" + "ilde", "\\tilde")
    .replaceAll(`0.02/(${nul}0${nul})`, "0.02/(0.02+0.13)")
    .replaceAll(`1/(${nul}0${nul})=2.5`, "1/(1-0.6)=2.5")
    .replaceAll(`1/(${nul}0${nul})=4`, "1/(1-0.75)=4")
    .replaceAll(`1/(${nul}3${nul})=2`, "1/(1-0.6+0.1)=2")
    .replaceAll(`1 - c)\\((` + nul + "2" + nul + ") + m)", "1-c(1-t)+m")
    .replaceAll(`(xK)^${nul}0${nul}(xL)^{1-${nul}1${nul}}`, "(xK)^α(xL)^(1-α)");
}

function replaceKnownFormulas(text: string): string {
  const replacements: readonly [string, string][] = [
    [
      "π_t = (P_t - P_{t-1}) / P_{t-1}",
      String.raw`\(\pi_t = \frac{P_t-P_{t-1}}{P_{t-1}}\)`,
    ],
    ["πₜ = (Pₜ − Pₜ₋₁) / Pₜ₋₁", String.raw`\(\pi_t = \frac{P_t-P_{t-1}}{P_{t-1}}\)`],
    [
      "Growth = (Y_t - Y_{t-1}) / Y_{t-1} × 100%",
      String.raw`Growth = \(\frac{Y_t-Y_{t-1}}{Y_{t-1}} \times 100\%\)`,
    ],
    ["g = (Y_t - Y_{t-1})/Y_{t-1}", String.raw`\(g = \frac{Y_t-Y_{t-1}}{Y_{t-1}}\)`],
    ["Y = A K^α L^(1-α)", String.raw`\(Y = A K^\alpha L^{1-\alpha}\)`],
    ["Y=A K^α L^(1-α)", String.raw`\(Y = A K^\alpha L^{1-\alpha}\)`],
    [
      "y = Y/L = A(K/L)^α = A k^α",
      String.raw`\(y = \frac{Y}{L} = A\left(\frac{K}{L}\right)^\alpha = A k^\alpha\)`,
    ],
    ["Y_n = Y_0(1+g)^n", String.raw`\(Y_n = Y_0(1+g)^n\)`],
    ["D_t = D_{t-1} - BB_t", String.raw`\(D_t = D_{t-1} - BB_t\)`],
    ["πᵉ_t = π_{t-1}", String.raw`\(\pi^e_t = \pi_{t-1}\)`],
    [
      "K₁ = K₀ + I - δK₀ = (1-δ)K₀ + I",
      String.raw`\(K_1 = K_0 + I - \delta K_0 = (1-\delta)K_0 + I\)`,
    ],
    [
      "K₁ = K₀ + I − δK₀ = (1−δ)K₀ + I",
      String.raw`\(K_1 = K_0 + I - \delta K_0 = (1-\delta)K_0 + I\)`,
    ],
    [
      "G_t + TR_t + rD_{t-1} = \\tilde T_t + (D_t - D_{t-1})",
      String.raw`\(G_t + TR_t + rD_{t-1} = \tilde{T}_t + (D_t-D_{t-1})\)`,
    ],
    [
      "G_t + TR_t + rD_{t-1} = \\tilde T_t + (D_t − D_{t-1})",
      String.raw`\(G_t + TR_t + rD_{t-1} = \tilde{T}_t + (D_t-D_{t-1})\)`,
    ],
    [
      "Δd = [(r-g)/(1+g)] d_{t-1} - pbb_t",
      String.raw`\(\Delta d = \frac{r-g}{1+g}d_{t-1} - pbb_t\)`,
    ],
    [
      "Δd = [(r-g)/(1+g)] d₍ₜ₋₁₎ - pbbₜ",
      String.raw`\(\Delta d = \frac{r-g}{1+g}d_{t-1} - pbb_t\)`,
    ],
    [
      "Output gap = (Y - Y*) / Y* × 100%",
      String.raw`Output gap = \(\frac{Y-Y^*}{Y^*}\times 100\%\)`,
    ],
    [
      "(Y - Y*)/Y* × 100 = -β(u - u*)",
      String.raw`\(\frac{Y-Y^*}{Y^*}\times 100 = -\beta(u-u^*)\)`,
    ],
    ["u* = s / (s + f)", String.raw`\(u^* = \frac{s}{s+f}\)`],
    ["u* = s/(s+f)", String.raw`\(u^* = \frac{s}{s+f}\)`],
    ["Formula: u* = s/(s + f).", String.raw`Formula: \(u^* = \frac{s}{s+f}\).`],
    ["output gap = −β(u − u*).", String.raw`output gap = \(-\beta(u-u^*)\).`],
    ["output gap = −β(u − u*),", String.raw`output gap = \(-\beta(u-u^*)\),`],
    ["r ≈ i - π", String.raw`\(r\approx i-\pi\)`],
    ["i ≈ r + πᵉ", String.raw`\(i\approx r+\pi^e\)`],
    ["r = (1+i)/(1+π) - 1", String.raw`\(r = \frac{1+i}{1+\pi}-1\)`],
    ["MPL ≈ W/P", String.raw`\(MPL\approx \frac{W}{P}\)`],
    ["p×MPL = W", String.raw`\(p\times MPL = W\)`],
    ["g_M + g_V ≈ π + g_Y", String.raw`\(g_M+g_V\approx\pi+g_Y\)`],
    ["C = C₀ + cYᴰ", String.raw`\(C=C_0+cY_D\)`],
    ["C = C₀ + cY_D", String.raw`\(C=C_0+cY_D\)`],
    ["APC = C/Yᴰ", String.raw`\(APC=\frac{C}{Y_D}\)`],
    ["M/P = L(Y, i)", String.raw`\(\frac{M}{P}=L(Y,i)\)`],
    [
      "0.02/(0.02+0.13) = 0.1333 = 13.33%.",
      String.raw`\(\frac{0.02}{0.02+0.13}=0.1333=13.33\%\).`,
    ],
    ["VMPL=p×MPL", String.raw`\(VMPL=p\times MPL\)`],
    ["VMPL = p×MPL", String.raw`\(VMPL=p\times MPL\)`],
    [
      "Because the exponents sum to one: (xK)^α(xL)^(1-α)=xK^αL^(1-α).",
      String.raw`Because the exponents sum to one: \((xK)^\alpha(xL)^{1-\alpha}=xK^\alpha L^{1-\alpha}\).`,
    ],
    ["Y=AK^αL^(1-α)", String.raw`\(Y=AK^\alpha L^{1-\alpha}\)`],
    ["r ≈ i - π^e", String.raw`\(r\approx i-\pi^e\)`],
    ["i ≈ r + π^e", String.raw`\(i\approx r+\pi^e\)`],
    ["i ≈ r + πᵉ", String.raw`\(i\approx r+\pi^e\)`],
    [
      "G_t + TR_t + rD_{t-1} = \\tilde T_t + (D_t - D_{t-1}).",
      String.raw`\(G_t+TR_t+rD_{t-1}=\tilde{T}_t+(D_t-D_{t-1})\).`,
    ],
    [
      "G_t + TR_t + rD_{t-1} = " + "\tilde T_t + (D_t - D_{t-1}).",
      String.raw`\(G_t+TR_t+rD_{t-1}=\tilde{T}_t+(D_t-D_{t-1})\).`,
    ],
    ["PAE=340+0.5Y, so Y=680.", String.raw`\(PAE=340+0.5Y\), so \(Y=680\).`],
    [
      "Set Y=200+0.6Y+80+60-0.1Y. Then 0.5Y=340. The multiplier is 1/(1-0.6+0.1)=2.",
      String.raw`Set \(Y=200+0.6Y+80+60-0.1Y\). Then \(0.5Y=340\). The multiplier is \(\frac{1}{1-0.6+0.1}=2\).`,
    ],
    ["k = 1 / [1 - c(1-t) + m].", String.raw`\(k=\frac{1}{1-c(1-t)+m}\).`],
    [
      "Net investment = gross investment I - depreciation δK.",
      String.raw`Net investment = \(I-\delta K\).`,
    ],
    [
      "Yᵉ = [C₀ - cT₀ + I₀ + G₀] / [1 - c(1-t)].",
      String.raw`\(Y^e=\frac{C_0-cT_0+I_0+G_0}{1-c(1-t)}\).`,
    ],
    ["ΔG₀=ΔT₀", String.raw`\(\Delta G_0=\Delta T_0\)`],
    [
      "k_BB = (1-c)/[1 - c(1-t)] = k_G + k_T.",
      String.raw`\(k_{BB}=\frac{1-c}{1-c(1-t)}=k_G+k_T\).`,
    ],
    [
      "(1+i₀,₂)² = (1+i₀,₁)(1+E i₁,₂);",
      String.raw`\((1+i_{0,2})^2=(1+i_{0,1})(1+E[i_{1,2}])\);`,
    ],
    [
      "Under the convention e = foreign currency per A$",
      String.raw`Under the convention \(e\) = foreign currency per A$`,
    ],
    [
      "Public saving is T-G=(300-40-20)-180=$60 under the course’s net-tax convention.",
      String.raw`Public saving is \(T-G=(300-40-20)=\$60\) under the course’s net-tax convention.`,
    ],
    [
      "GDP = nominal GDP / price index when the index is written as a ratio rather than 100-based",
      String.raw`\(GDP=\frac{\text{nominal GDP}}{\text{price index}}\) when the index is written as a ratio rather than 100-based`,
    ],
    [
      "CPI_t = cost of base-year basket at current prices / cost of base-year basket at base-year prices",
      String.raw`\(CPI_t=\frac{\text{cost of base-year basket at current prices}}{\text{cost of base-year basket at base-year prices}}\)`,
    ],
    ["LF = employed E + unemployed U", String.raw`\(LF=E+U\)`],
    [
      "Household saving S_h = disposable income Y_D - consumption C",
      String.raw`Household saving \(S_h=Y_D-C\)`,
    ],
    [
      "Y_D = Y - TA + TR + INT - RE under its notation",
      String.raw`\(Y_D=Y-TA+TR+INT-RE\) under its notation`,
    ],
    [
      "ΔW = saving + net capital gains",
      String.raw`\(\Delta W=S+\text{net capital gains}\)`,
    ],
    [
      "T = tax receipts - transfers - government interest payments",
      "T is tax receipts net of transfers and government interest payments",
    ],
    [
      "NS=I by inducing more household saving",
      String.raw`\(NS=I\) by inducing more household saving`,
    ],
    ["AE=Y by construction", String.raw`\(AE=Y\) by construction`],
    ["AE=Y is always true ex post", String.raw`\(AE=Y\) is always true ex post`],
    ["Y=AE is an accounting identity", String.raw`\(Y=AE\) is an accounting identity`],
    [
      "Y=PAE is the behavioural equilibrium condition",
      String.raw`\(Y=PAE\) is the behavioural equilibrium condition`,
    ],
    ["Iᴾ=50 is exogenous", String.raw`\(I^P=50\) is exogenous`],
    [
      "BB = tax receipts - transfers - interest - government purchases",
      String.raw`\(BB=\text{tax receipts}-\text{transfers}-\text{interest}-\text{government purchases}\)`,
    ],
    ["d=D/Y rather than D alone", String.raw`\(d=D/Y\) rather than D alone`],
    [
      "M = currency held by the public + bank deposits usable for payment (Cu + D)",
      String.raw`Money stock is \(M=C_u+D\): currency held by the public plus bank deposits usable for payment.`,
    ],
    [
      "MV=PY itself a theory",
      String.raw`\(MV=PY\) itself is an accounting identity, not a causal theory`,
    ],
    [
      "MV=PY gives money growth plus velocity growth approximately equal to inflation plus real-output growth",
      String.raw`\(MV=PY\) gives money growth plus velocity growth approximately equal to inflation plus real-output growth`,
    ],
    ["r ≈ i - expected inflation", String.raw`\(r\approx i-\pi^e\)`],
    [
      "Y = 587.5 - 37.5π (approximately 587 - 37.5π if rounded as in course material)",
      String.raw`\(Y=587.5-37.5\pi\), approximately \(Y=587-37.5\pi\) if rounded as in course material`,
    ],
    [
      "π = πᵉ + λ(output gap) + supply shock",
      String.raw`\(\pi=\pi^e+\lambda\,\text{output gap}+\text{supply shock}\)`,
    ],
    ["e=foreign currency per AUD", String.raw`\(e\) = foreign currency per AUD`],
    [
      "Quote convention: e = USD per AUD.",
      String.raw`Quote convention: \(e\) = USD per AUD.`,
    ],
    ["S=I only", String.raw`\(S=I\) only`],
    [
      "i = 4 + 1.5(π − πᵀ) + 0.5(output gap)",
      String.raw`\(i=4+1.5(\pi-\pi^T)+0.5\,\text{output gap}\)`,
    ],
    [
      "i=3+1.5(π − πᵀ)+0.5(output gap)",
      String.raw`\(i=3+1.5(\pi-\pi^T)+0.5\,\text{output gap}\)`,
    ],
    ["KFA=-$25 billion", String.raw`\(KFA=-\$25\) billion`],
    ["KFA=+$25 billion", String.raw`\(KFA=+\$25\) billion`],
    ["KFA=+$50 billion", String.raw`\(KFA=+\$50\) billion`],
    [
      "KFA=0 because the current account is negative",
      String.raw`\(KFA=0\) because the current account is negative`,
    ],
    [
      "KFA=+25 billion under the stated sign convention",
      String.raw`\(KFA=+25\) billion under the stated sign convention`,
    ],
    [
      "KFA=+25 exactly offsets CA=-25 in CA+KFA=0",
      String.raw`\(KFA=+25\) exactly offsets \(CA=-25\) in \(CA+KFA=0\)`,
    ],
    [
      "k = 1 / (1 - c + m) to calculate the change in equilibrium output caused by the displayed autonomous-expenditure increase",
      String.raw`\(k=\frac{1}{1-c+m}\) to calculate the change in equilibrium output caused by the displayed autonomous-expenditure increase`,
    ],
    [
      "Y/Y = ΔA/A + αΔK/K + (1-α)ΔL/L to calculate predicted output growth from the table",
      String.raw`\(Y/Y=\Delta A/A+\alpha\Delta K/K+(1-\alpha)\Delta L/L\) to calculate predicted output growth from the table`,
    ],
    [
      "MPC=.70 means consumption rises by .70×50=$35",
      String.raw`With \(MPC=.70\), consumption rises by \(.70\times50=\$35\)`,
    ],
    [
      "Multiplier = 1/(1-0.6)=2.5, so ΔY=50.",
      String.raw`Multiplier = \(\frac{1}{1-0.6}=2.5\), so \(\Delta Y=50\).`,
    ],
    [
      "The multiplier is 1/(1-0.75)=4, so ΔY=4×20=80.",
      String.raw`The multiplier is \(\frac{1}{1-0.75}=4\), so \(\Delta Y=4\times 20=80\).`,
    ],
    [
      "Because the exponents sum to one: (xK)^α(xL)^(1-α)=xK^αL^(1-α).",
      String.raw`Because the exponents sum to one: \((xK)^\alpha(xL)^{1-\alpha}=xK^\alpha L^{1-\alpha}\).`,
    ],
    [
      "Gross return = (P₁ + income)/P₀; net rate of return = (P₁ + income - P₀)/P₀.",
      String.raw`Gross return = \(\frac{P_1+\text{income}}{P_0}\); net rate of return = \(\frac{P_1+\text{income}-P_0}{P_0}\).`,
    ],
    [
      "Here δK₀ is physical depreciation during the period.",
      String.raw`Here \(\delta K_0\) is physical depreciation during the period.`,
    ],
    [
      "UC ≈ P_K(r + δ), or in rate form uc ≈ r + δ.",
      String.raw`\(UC\approx P_K(r+\delta)\), or in rate form \(uc\approx r+\delta\).`,
    ],
    [
      "The increase in consumption caused by a one-unit increase in disposable income; in C=C₀+cYᴰ it is c.",
      String.raw`The increase in consumption caused by a one-unit increase in disposable income; in \(C=C_0+cY_D\), it is \(c\).`,
    ],
    [
      "Because the national accounts identity makes actual expenditure equal actual output, AE=Y by construction.",
      String.raw`Because the national accounts identity makes actual expenditure equal actual output, \(AE=Y\) by construction.`,
    ],
    [
      "The equilibrium condition is PAE=Y, not “AE=Y,” because AE=Y is always true ex post.",
      String.raw`The equilibrium condition is \(PAE=Y\), not “\(AE=Y\),” because \(AE=Y\) is always true ex post.`,
    ],
    [
      "From -2 = -2.5(u-u*), cyclical unemployment is +0.8 percentage points. Add it to the natural rate to obtain actual unemployment.",
      String.raw`From \(-2=-2.5(u-u^*)\), cyclical unemployment is +0.8 percentage points. Add it to the natural rate to obtain actual unemployment.`,
    ],
    [
      "115 = 100 + 20 - δ×100, so depreciation is 5 and δ=0.05. This calculation can also be reversed to find investment or the ending stock.",
      String.raw`\(115=100+20-\delta\times100\), so depreciation is 5 and \(\delta=0.05\). This calculation can also be reversed to find investment or the ending stock.`,
    ],
    [
      "Starting from UC ≈ P_K[i + δ - ΔP_K/P_K], replacing capital-price inflation by π gives i-π=r. Thus a higher real interest rate or depreciation rate raises the cost of holding capital.",
      String.raw`Starting from \(UC\approx P_K[i+\delta-\Delta P_K/P_K]\), replacing capital-price inflation by \(\pi\) gives \(i-\pi=r\). Thus a higher real interest rate or depreciation rate raises the cost of holding capital.`,
    ],
    [
      "The intercept of saving is -C₀, not +C₀.",
      String.raw`The intercept of saving is \(-C_0\), not \(+C_0\).`,
    ],
    [
      "Combine induced terms carefully: 0.6Y-0.1Y=0.5Y.",
      String.raw`Combine induced terms carefully: \(0.6Y-0.1Y=0.5Y\).`,
    ],
    [
      "BB>0 is a surplus; BB<0 is a deficit.",
      String.raw`\(BB>0\) is a surplus; \(BB<0\) is a deficit.`,
    ],
    [
      "The approximation averages expected short rates: (2%+4%)/2=3%. Exactly, solve (1+i₀,₂)² = (1+i₀,₁)(1+E i₁,₂), giving just under 3%.",
      String.raw`The approximation averages expected short rates: \((2\%+4\%)/2=3\%\). Exactly, solve \((1+i_{0,2})^2=(1+i_{0,1})(1+E[i_{1,2}])\), giving just under 3\%.`,
    ],
    [
      "If i rose less than inflation expectations, r≈i-πᵉ could fall, stimulating demand and amplifying inflation. A coefficient on inflation above one embodies the Taylor principle.",
      String.raw`If i rose less than inflation expectations, \(r\approx i-\pi^e\) could fall, stimulating demand and amplifying inflation. A coefficient on inflation above one embodies the Taylor principle.`,
    ],
    [
      "Add C and I: autonomous expenditure is 280, induced expenditure is 0.6Y, and total interest sensitivity is -20r-10r=-30r.",
      String.raw`Add C and I: autonomous expenditure is 280, induced expenditure is \(0.6Y\), and total interest sensitivity is \(-20r-10r=-30r\).`,
    ],
    [
      "A compact expression is CA = exports - imports + net primary income + net secondary income. The trade balance is only one component of the current account.",
      String.raw`A compact expression is \(CA=\text{exports}-\text{imports}+\text{net primary income}+\text{net secondary income}\). The trade balance is only one component of the current account.`,
    ],
    [
      "Using output gap = -β(u-u*), the unemployment gap is +2 points, so output is about 4% below potential.",
      String.raw`Using \(\text{output gap}=-\beta(u-u^*)\), the unemployment gap is +2 points, so output is about 4% below potential.`,
    ],
    [
      "From g_M+g_V≈π+g_Y, set g_V=0 and rearrange π≈7%-2%=5%.",
      String.raw`From \(g_M+g_V\approx\pi+g_Y\), set \(g_V=0\) and rearrange \(\pi\approx7\%-2\%=5\%\).`,
    ],
    [
      "The approximate Fisher relation is i≈r+πᵉ, so expected inflation is πᵉ≈1.75%-1.50%=0.25%.",
      String.raw`The approximate Fisher relation is \(i\approx r+\pi^e\), so expected inflation is \(\pi^e\approx1.75\%-1.50\%=0.25\%\).`,
    ],
    [
      "Solving 550=500+80-500δ gives 500δ=30 and δ=6%.",
      String.raw`Solving \(550=500+80-500\delta\) gives \(500\delta=30\) and \(\delta=6\%\).`,
    ],
    [
      "The four-sector PAE slope is c(1-t)-m=0.80(0.75)-0.10=0.60-0.10=0.50.",
      String.raw`The four-sector PAE slope is \(c(1-t)-m=0.80(0.75)-0.10=0.60-0.10=0.50\).`,
    ],
    [
      "The slope is c(1-t)-m=.80(.75)-.10=.50, so this is the correct four-sector coefficient.",
      String.raw`The slope is \(c(1-t)-m=.80(.75)-.10=.50\), so this is the correct four-sector coefficient.`,
    ],
    [
      "The net return is (P₁+income-P₀)/P₀=(105+4-100)/100=0.09, or 9%.",
      String.raw`The net return is \(\frac{P_1+\text{income}-P_0}{P_0}=\frac{105+4-100}{100}=0.09\), or 9\%.`,
    ],
    [
      "Substitution gives 420-16π, so higher inflation lowers output through the PRF-induced real-rate increase.",
      String.raw`Substitution gives \(Y=420-16\pi\), so higher inflation lowers output through the PRF-induced real-rate increase.`,
    ],
    [
      "What economic change is represented by the shift from π₀ to π₁ in the graph?",
      String.raw`What economic change is represented by the shift from \(\pi_0\) to \(\pi_1\) in the graph?`,
    ],
    [
      "The graph uses the course's very-short-run convention: the short-run inflation line is horizontal at inherited inflation. The shift from π₀ to the lower line π₁ leaves the unchanged downward-sloping AD curve intersecting at lower inflation and higher output, which represents a favourable supply shock.",
      String.raw`The graph uses the course's very-short-run convention: the short-run inflation line is horizontal at inherited inflation. The shift from \(\pi_0\) to the lower line \(\pi_1\) leaves the unchanged downward-sloping AD curve intersecting at lower inflation and higher output, which represents a favourable supply shock.`,
    ],
    [
      "For economy B, use ΔY/Y=ΔA/A+αΔK/K+(1-α)ΔL/L to calculate predicted output growth from the table.",
      String.raw`For economy B, use \(\Delta Y/Y=\Delta A/A+\alpha\Delta K/K+(1-\alpha)\Delta L/L\) to calculate predicted output growth from the table.`,
    ],
    [
      "Participation rate = LF / working-age population × 100%.",
      String.raw`Participation rate = \(\frac{LF}{\text{working-age population}}\times100\%\).`,
    ],
    [
      "Employment-to-population ratio = E / working-age population × 100%.",
      String.raw`Employment-to-population ratio = \(\frac{E}{\text{working-age population}}\times100\%\).`,
    ],
    [
      "The real wage is W/P, not W×P.",
      String.raw`The real wage is \(W/P\), not \(W\times P\).`,
    ],
    [
      "Doubling numerator and denominator leaves W/P constant. The chapter review uses this to test whether you distinguish nominal from real variables.",
      String.raw`Doubling numerator and denominator leaves \(W/P\) constant. The chapter review uses this to test whether you distinguish nominal from real variables.`,
    ],
    [
      "Public saving = T - G, where T = tax receipts - transfers - government interest payments.",
      String.raw`Public saving = \(T-G\), where \(T\) is tax receipts net of transfers and government interest payments.`,
    ],
    [
      "Once taxes are introduced, consumption depends on disposable income Y-T rather than simply Y.",
      String.raw`Once taxes are introduced, consumption depends on disposable income \(Y-T\) rather than simply \(Y\).`,
    ],
    [
      "MPC is a marginal change, not C/Y.",
      String.raw`MPC is a marginal change, not \(C/Y\).`,
    ],
    [
      "The first round is +20 output, the next induced-consumption round is +12, then +7.2, etc. Summing all rounds gives 20×2.5=50.",
      String.raw`The first round is +20 output, the next induced-consumption round is +12, then +7.2, etc. Summing all rounds gives \(20\times2.5=50\).`,
    ],
    [
      "The sign of unplanned inventory investment is Y-PAE here, not PAE-Y.",
      String.raw`The sign of unplanned inventory investment is \(Y-PAE\) here, not \(PAE-Y\).`,
    ],
    [
      "t is a marginal rate, not the average tax rate T/Y.",
      String.raw`\(t\) is a marginal rate, not the average tax rate \(T/Y\).`,
    ],
    [
      "The spending increase raises PAE by the full ΔG, while the equal tax increase initially reduces consumption only by cΔT. The net first-round injection is (1-c)ΔG, which is then multiplied.",
      String.raw`The spending increase raises PAE by the full \(\Delta G\), while the equal tax increase initially reduces consumption only by \(c\Delta T\). The net first-round injection is \((1-c)\Delta G\), which is then multiplied.`,
    ],
    [
      "(1-0.8)/[1-0.8(0.7)] = 0.2/0.44 ≈ 0.45.",
      String.raw`\(\frac{1-0.8}{1-0.8(0.7)}=\frac{0.2}{0.44}\approx0.45\).`,
    ],
    [
      "The required instrument change equals the desired ΔY divided by the relevant fiscal multiplier.",
      String.raw`The required instrument change equals the desired \(\Delta Y\) divided by the relevant fiscal multiplier.`,
    ],
    [
      "pbb is the primary balance as a share of GDP; a primary surplus is positive and lowers Δd.",
      String.raw`\(pbb\) is the primary balance as a share of GDP; a primary surplus is positive and lowers \(\Delta d\).`,
    ],
    ["100/1.04 ≈ $96.15.", String.raw`\(100/1.04\approx\$96.15\).`],
    [
      "How does higher real income Y affect the real money-demand curve MD/P?",
      String.raw`How does higher real income \(Y\) affect the real money-demand curve \(MD/P\)?`,
    ],
    [
      "Nominal money demand doubles; real money demand MD/P is unchanged.",
      String.raw`Nominal money demand doubles; real money demand \(MD/P\) is unchanged.`,
    ],
    [
      "A price-level change shifts nominal MD but does not shift a real MD/P schedule expressed in purchasing-power units.",
      String.raw`A price-level change shifts nominal MD but does not shift a real \(MD/P\) schedule expressed in purchasing-power units.`,
    ],
    [
      "Actual output minus potential output, often expressed as a percentage of potential: (Y-Y*)/Y* ×100%.",
      String.raw`Actual output minus potential output, often expressed as a percentage of potential: \(\frac{Y-Y^*}{Y^*}\times100\%\).`,
    ],
    [
      "e is commonly units of foreign currency per Australian dollar, e.g. USD/AUD.",
      String.raw`\(e\) is commonly units of foreign currency per Australian dollar, e.g. USD/AUD.`,
    ],
    [
      "Multiply AUD by USD per AUD: 200×0.65=130. Dimensional analysis cancels AUD and leaves USD.",
      String.raw`Multiply AUD by USD per AUD: \(200\times0.65=130\). Dimensional analysis cancels AUD and leaves USD.`,
    ],
    [
      "Divide USD by USD/AUD: 130/0.65=200 AUD. This is the reciprocal conversion of the previous card.",
      String.raw`Divide USD by USD/AUD: \(130/0.65=200\) AUD. This is the reciprocal conversion of the previous card.`,
    ],
    ["0.65/1.10 ≈ 0.591 EUR.", String.raw`\(0.65/1.10\approx0.591\) EUR.`],
    ["5.20/8 = 0.65 USD/AUD.", String.raw`\(5.20/8=0.65\) USD/AUD.`],
    [
      "An increase in capital per worker, K/L.",
      String.raw`An increase in capital per worker, \(K/L\).`,
    ],
    [
      "Y/Population = (Y/L) × (L/Population).",
      String.raw`\(Y/\text{Population}=(Y/L)\times(L/\text{Population})\).`,
    ],
    [
      "More exactly, real growth is roughly 1.08/1.05-1≈2.86%.",
      String.raw`More exactly, real growth is roughly \(1.08/1.05-1\approx2.86\%\).`,
    ],
    [
      "A higher price level changes nominal money demand but not real MD/P if real activity and i are unchanged.",
      String.raw`A higher price level changes nominal money demand but not real \(MD/P\) if real activity and \(i\) are unchanged.`,
    ],
    [
      "The exponents sum to one, so the function has constant returns to scale: 2^0.3×2^0.7=2.",
      String.raw`The exponents sum to one, so the function has constant returns to scale: \(2^{0.3}\times2^{0.7}=2\).`,
    ],
    [
      "A comparable good costs A$10 in Australia and US$7.50 in the United States. Under the law of one price, what USD/AUD rate would equalise the common-currency prices?",
      "A comparable good costs A$10 in Australia and US$7.50 in the United States. Under the law of one price, what USD/AUD rate would equalise the common-currency prices?",
    ],
    [
      "The common-currency equality requires US price divided by Australian price, 7.50/10=.75 USD/AUD.",
      String.raw`The common-currency equality requires US price divided by Australian price, \(7.50/10=.75\) USD/AUD.`,
    ],
    [
      "The compound formula 100×1.03² gives 106.09.",
      String.raw`The compound formula \(100\times1.03^2\) gives 106.09.`,
    ],
    [
      "The rule of 70 gives doubling time ≈70 divided by the annual percentage rate: 70/2≈35 years.",
      String.raw`The rule of 70 gives doubling time ≈70 divided by the annual percentage rate: \(70/2\approx35\) years.`,
    ],
    [
      "This multiplies A by K/L without applying the exponent .5.",
      String.raw`This multiplies \(A\) by \(K/L\) without applying the exponent 0.5.`,
    ],
    [
      "It rises because Y/Population=(Y/L)(L/Population).",
      String.raw`It rises because \(Y/\text{Population}=(Y/L)(L/\text{Population})\).`,
    ],
    [
      "The decomposition directly implies a rise when L/Population rises and Y/L is fixed.",
      String.raw`The decomposition directly implies a rise when \(L/\text{Population}\) rises and \(Y/L\) is fixed.`,
    ],
    [
      "The stated formula gives .72×1.20=.864.",
      String.raw`The stated formula gives \(.72\times1.20=.864\).`,
    ],
    [
      "The graph gives (105 - 102) / 102 × 100 ≈ 2.94%, so 2.9% is the appropriate rounded rate.",
      String.raw`The graph gives \(\frac{105-102}{102}\times100\approx2.94\%\), so 2.9\% is the appropriate rounded rate.`,
    ],
    [
      "Inflation is the percentage change in the price index: (105 - 102) / 102 × 100 ≈ 2.94%, which rounds to 2.9%.",
      String.raw`Inflation is the percentage change in the price index: \(\frac{105-102}{102}\times100\approx2.94\%\), which rounds to 2.9\%.`,
    ],
    [
      "Using GDP deflator = nominal GDP / real GDP × 100, what is the 2024 GDP deflator in the table?",
      String.raw`Using GDP deflator = \(\frac{\text{nominal GDP}}{\text{real GDP}}\times100\), what is the 2024 GDP deflator in the table?`,
    ],
    [
      "The 2024 deflator is 286 / 250 × 100 = 114.4.",
      String.raw`The 2024 deflator is \(286/250\times100=114.4\).`,
    ],
    [
      "Using unemployment rate = unemployed / labour force × 100, what is the unemployment rate in 2025?",
      String.raw`Using unemployment rate = \(\frac{\text{unemployed}}{\text{labour force}}\times100\), what is the unemployment rate in 2025?`,
    ],
    [
      "The 2025 labour force is 920 + 80 = 1,000, so the unemployment rate is 80 / 1,000 × 100 = 8%.",
      String.raw`The 2025 labour force is \(920+80=1{,}000\), so the unemployment rate is \(80/1{,}000\times100=8\%\).`,
    ],
    [
      "The 2025 ratio is nominal government debt divided by nominal GDP: 900 / 2,250 × 100 = 40%.",
      String.raw`The 2025 ratio is nominal government debt divided by nominal GDP: \(900/2{,}250\times100=40\%\).`,
    ],
    [
      "Bank B holds 75 million in reserves against 750 million in deposits, so the reserve-deposit ratio is 75/750 × 100 = 10%.",
      String.raw`Bank B holds 75 million in reserves against 750 million in deposits, so the reserve-deposit ratio is \(75/750\times100=10\%\).`,
    ],
    [
      "The multiplier is 2.5 and 2.5 × 40 = 100.",
      String.raw`The multiplier is 2.5 and \(2.5\times40=100\).`,
    ],
    [
      "Multiplying 0.65 USD/AUD by 0.92 EUR/USD gives approximately 0.60 EUR/AUD.",
      String.raw`Multiplying 0.65 USD/AUD by 0.92 EUR/USD gives approximately \(0.60\) EUR/AUD.`,
    ],
    [
      "The approximation averages expected short rates: (2%+4%)/2=3%. Exactly, solve (1+i₂)²=1.02×1.04, giving just under 3%.",
      String.raw`The approximation averages expected short rates: \((2\%+4\%)/2=3\%\). Exactly, solve \((1+i_2)^2=1.02\times1.04\), giving just under 3\%.`,
    ],
    ["S + Iᴾ = M + X.", String.raw`\(S+I^P=M+X\).`],
    ["S + M = Iᴾ + X.", String.raw`\(S+M=I^P+X\).`],
    ["S + X = Iᴾ + M.", String.raw`\(S+X=I^P+M\).`],
    ["S + M + X = Iᴾ.", String.raw`\(S+M+X=I^P\).`],
    [
      "Saving and imports are leakages from domestic spending, while planned investment and exports are injections. Equilibrium therefore requires S+M=Iᴾ+X.",
      String.raw`Saving and imports are leakages from domestic spending, while planned investment and exports are injections. Equilibrium therefore requires \(S+M=I^P+X\).`,
    ],
    [
      "The open-economy leakage-injection condition is S+M=Iᴾ+X.",
      String.raw`The open-economy leakage-injection condition is \(S+M=I^P+X\).`,
    ],
    [
      "Set Y=250+0.5Y-20r, so 0.5Y=250-20r and Y=500-40r.",
      String.raw`Set \(Y=250+0.5Y-20r\), so \(0.5Y=250-20r\) and \(Y=500-40r\).`,
    ],
    [
      "The exact real rate is r=(1+i)/(1+π)-1=1.08/1.03-1≈0.0485, or 4.85%.",
      String.raw`The exact real rate is \(r=\frac{1+i}{1+\pi}-1=1.08/1.03-1\approx0.0485\), or 4.85\%.`,
    ],
    [
      "The exact multiplicative calculation gives 1.08/1.03-1≈4.85%.",
      String.raw`The exact multiplicative calculation gives \(1.08/1.03-1\approx4.85\%\).`,
    ],
    [
      "The autonomous $20 plus proportional tax of .25×$400=$100 gives total taxes of $120.",
      String.raw`The autonomous $20 plus proportional tax of \(.25\times\$400=\$100\) gives total taxes of $120.`,
    ],
    [
      "The output gap is (Y-Y*)/Y* ×100 = (980-1,000)/1,000 ×100 = -2%.",
      String.raw`The output gap is \(\frac{Y-Y^*}{Y^*}\times100=\frac{980-1{,}000}{1{,}000}\times100=-2\%\).`,
    ],
    [
      "This uses the standard old-value denominator and gives 25/500 × 100 = 5%.",
      String.raw`This uses the standard old-value denominator and gives \(25/500\times100=5\%\).`,
    ],
    [
      "Percentage growth uses the change divided by the earlier value: (525 - 500) / 500 × 100 = 5%.",
      String.raw`Percentage growth uses the change divided by the earlier value: \(\frac{525-500}{500}\times100=5\%\).`,
    ],
    ["(525 - 500) / 525 × 100", String.raw`\(\frac{525-500}{525}\times100\)`],
    ["25 / 100 × 100", String.raw`\(25/100\times100\)`],
    ["(500 - 525) / 500 × 100", String.raw`\(\frac{500-525}{500}\times100\)`],
    ["(525 - 500) / 500 × 100", String.raw`\(\frac{525-500}{500}\times100\)`],
    [
      "The formula gives .72×1.20=.864.",
      String.raw`The formula gives \(.72\times1.20=.864\).`,
    ],
    [
      "The balance-of-payments identity requires KFA=-CA. If CA=-25, then KFA=+25 billion under the stated sign convention.",
      String.raw`The balance-of-payments identity requires \(KFA=-CA\). If \(CA=-25\), then \(KFA=+25\) billion under the stated sign convention.`,
    ],
    [
      "KFA=+25 exactly offsets CA=-25 in CA+KFA=0.",
      String.raw`\(KFA=+25\) exactly offsets \(CA=-25\) in \(CA+KFA=0\).`,
    ],
    [
      "Hire the additional worker because VMPL=$60 exceeds W=$54.",
      String.raw`Hire the additional worker because \(VMPL=\$60\) exceeds \(W=\$54\).`,
    ],
    [
      "VMPL=p×MPL=$12×5=$60>$54, so the marginal hiring condition supports hiring.",
      String.raw`\(VMPL=p\times MPL=\$12\times5=\$60>\$54\), so the marginal hiring condition supports hiring.`,
    ],
    ["S+Iᴾ=M+X", String.raw`\(S+I^P=M+X\)`],
    ["S+M=Iᴾ+X", String.raw`\(S+M=I^P+X\)`],
    ["S+X=Iᴾ+M", String.raw`\(S+X=I^P+M\)`],
    ["S+M+X=Iᴾ", String.raw`\(S+M+X=I^P\)`],
    [
      "Ignoring statistical discrepancy, if the current-account balance is -$25 billion under the course sign convention, what financial-account counterpart is required by CA+KFA=0?",
      String.raw`Ignoring statistical discrepancy, if the current-account balance is -$25 billion under the course sign convention, what financial-account counterpart is required by \(CA+KFA=0\)?`,
    ],
    [
      "What economic change is represented by the shift from π0 to π1 in the graph?",
      String.raw`What economic change is represented by the shift from \(\pi_0\) to \(\pi_1\) in the graph?`,
    ],
    [
      "The graph uses the course's very-short-run convention: the short-run inflation line is horizontal at inherited inflation. The shift from π0 to the lower line π1 leaves the unchanged downward-sloping AD curve intersecting at lower inflation and higher output, which represents a favourable supply shock.",
      String.raw`The graph uses the course's very-short-run convention: the short-run inflation line is horizontal at inherited inflation. The shift from \(\pi_0\) to the lower line \(\pi_1\) leaves the unchanged downward-sloping AD curve intersecting at lower inflation and higher output, which represents a favourable supply shock.`,
    ],
    [
      "For economy B, use ΔY/Y = ΔA/A + αΔK/K + (1−α)ΔL/L to calculate predicted output growth from the table.",
      String.raw`For economy B, use \(\Delta Y/Y=\Delta A/A+\alpha\Delta K/K+(1-\alpha)\Delta L/L\) to calculate predicted output growth from the table.`,
    ],
    [
      "The real wage W/P is unchanged, so labour demanded is unchanged.",
      String.raw`The real wage \(W/P\) is unchanged, so labour demanded is unchanged.`,
    ],
    [
      "Public saving = T - G, where T is tax receipts net of transfers and government interest payments.",
      String.raw`Public saving = \(T-G\), where \(T\) is tax receipts net of transfers and government interest payments.`,
    ],
    [
      "Cash rate ↑ → broader nominal interest rates ↑ → expected real interest rates ↑ (for given inflation expectations) → interest-sensitive C and I ↓ → PAE/AD ↓ → output pressure ↓.",
      String.raw`\[\text{cash rate}\uparrow\to\text{broader nominal interest rates}\uparrow\to\text{expected real interest rates}\uparrow\to\text{interest-sensitive }C\text{ and }I\downarrow\to PAE/AD\downarrow\to\text{output pressure}\downarrow\]`,
    ],
    [
      "Doubling time in years ≈ 70 divided by the annual percentage growth rate.",
      String.raw`Doubling time in years \(\approx\frac{70}{\text{annual percentage growth rate}}\).`,
    ],
    [
      "Average labour productivity Y/L and MPL are related but not generally identical.",
      String.raw`Average labour productivity \(Y/L\) and \(MPL\) are related but not generally identical.`,
    ],
    [
      "Increasing K and L at the same rate raises total Y but leaves K/L unchanged; without A growth it need not raise output per worker.",
      String.raw`Increasing \(K\) and \(L\) at the same rate raises total \(Y\) but leaves \(K/L\) unchanged; without \(A\) growth it need not raise output per worker.`,
    ],
    [
      "Do not reverse the identity to I-S.",
      String.raw`Do not reverse the identity to \(I-S\).`,
    ],
    [
      "PRF up → r down → C/I up → AD right",
      String.raw`\[\text{PRF}\uparrow\to r\downarrow\to C/I\uparrow\to\text{AD right}\]`,
    ],
    [
      "PRF down → r up → C/I down → AD left",
      String.raw`\[\text{PRF}\downarrow\to r\uparrow\to C/I\downarrow\to\text{AD left}\]`,
    ],
    [
      "PRF up → r up → C/I down → AD left",
      String.raw`\[\text{PRF}\uparrow\to r\uparrow\to C/I\downarrow\to\text{AD left}\]`,
    ],
    [
      "PRF up → r up → C/I up → AD right",
      String.raw`\[\text{PRF}\uparrow\to r\uparrow\to C/I\uparrow\to\text{AD right}\]`,
    ],
    [
      "Cash rate rises → broader and expected real rates rise → interest-sensitive C and I fall → PAE/AD falls.",
      String.raw`\[\text{cash rate rises}\to\text{broader and expected real rates rise}\to\text{interest-sensitive }C\text{ and }I\text{ fall}\to PAE/AD\text{ falls}\]`,
    ],
    [
      "If output per worker Y/L is unchanged but the employment-to-population ratio L/Population rises, what happens to real GDP per capita?",
      String.raw`If output per worker \(Y/L\) is unchanged but the employment-to-population ratio \(L/\text{Population}\) rises, what happens to real GDP per capita?`,
    ],
    [
      "It is unchanged because only Y/L matters.",
      String.raw`It is unchanged because only \(Y/L\) matters.`,
    ],
    [
      "PRF up → real rate up → C and I down → AD left → output down in the short run.",
      String.raw`\[\text{PRF}\uparrow\to\text{real rate}\uparrow\to C\text{ and }I\downarrow\to\text{AD left}\to\text{output down in the short run}\]`,
    ],
    [
      "Lower real rates support C and I, reducing the contractionary output gap. Fiscal expansion can also shift autonomous PAE/AD right.",
      String.raw`Lower real rates support \(C\) and \(I\), reducing the contractionary output gap. Fiscal expansion can also shift autonomous \(PAE/AD\) right.`,
    ],
    [
      "The rightward AUD-demand shift raises the equilibrium price of an AUD in USD. With e measured in USD/AUD, a higher e is an AUD appreciation.",
      String.raw`The rightward AUD-demand shift raises the equilibrium price of an AUD in USD. With \(e\) measured in USD/AUD, a higher \(e\) is an AUD appreciation.`,
    ],
    [
      "The new equilibrium has a higher e, and under USD/AUD that is an appreciation of the AUD.",
      String.raw`The new equilibrium has a higher \(e\), and under USD/AUD that is an appreciation of the AUD.`,
    ],
    [
      "One AUD is worth 0.65 USD, and each USD is worth 0.92 EUR. The cross-rate is 0.65 × 0.92 = 0.598 EUR/AUD, approximately €0.60 per AUD.",
      String.raw`One AUD is worth 0.65 USD, and each USD is worth 0.92 EUR. The cross-rate is \(0.65\times0.92=0.598\) EUR/AUD, approximately €0.60 per AUD.`,
    ],
    [
      "To make A$10 equal US$7.50, one Australian dollar must buy 7.50/10=0.75 USD. The correct rate is therefore 0.75 USD/AUD.",
      String.raw`To make A$10 equal US$7.50, one Australian dollar must buy \(7.50/10=0.75\) USD. The correct rate is therefore 0.75 USD/AUD.`,
    ],
    [
      "For B, output growth is 2% + 0.3×6% + 0.7×1% = 2% + 1.8% + 0.7% = 4.5%.",
      String.raw`For B, output growth is \(2\%+0.3\times6\%+0.7\times1\%=2\%+1.8\%+0.7\%=4.5\%\).`,
    ],
  ];
  const replaced = replacements.reduce(
    (value, [from, to]) => value.replaceAll(from, to),
    text,
  );
  return repairMixedMathFragments(replaced);
}

function repairMixedMathFragments(text: string): string {
  const replacements: readonly [string, string][] = [
    [String.raw`\(AE=Y an identity\)`, String.raw`\(AE=Y\) an identity`],
    [
      String.raw`\(AE=Y is not a behavioural condition that fails\)`,
      String.raw`\(AE=Y\) is not a behavioural condition that fails`,
    ],
    [
      String.raw`\(BB=0 in every single year\)`,
      String.raw`\(BB=0\) in every single year`,
    ],
    [
      String.raw`\(C=100+0.8Y in a two-sector model\)`,
      String.raw`\(C=100+0.8Y\) in a two-sector model`,
    ],
    [
      String.raw`\(CA=S-I becomes more negative\)`,
      String.raw`\(CA=S-I\) becomes more negative`,
    ],
    [String.raw`\(CA=S-I toward deficit\)`, String.raw`\(CA=S-I\) toward deficit`],
    [String.raw`\(GDP=real GDP\)`, String.raw`\(GDP=\text{real GDP}\)`],
    [String.raw`\(NS=I to determine r\)`, String.raw`\(NS=I\) to determine r`],
    [
      String.raw`\(PAE=800-760=\$40 of unplanned inventory accumulation\)`,
      String.raw`\(PAE=800-760=\$40\) of unplanned inventory accumulation`,
    ],
    [
      String.raw`\(PAE=Y is the behavioural equilibrium condition\)`,
      String.raw`\(PAE=Y\) is the behavioural equilibrium condition`,
    ],
    [
      String.raw`\(PAE=Y is always true ex post\)`,
      String.raw`\(PAE=Y\) is always true ex post`,
    ],
    [
      String.raw`\(Y=AE is always true ex post\)`,
      String.raw`\(Y=AE\) is always true ex post`,
    ],
    [
      String.raw`\(Y=PAE are behavioural conditions that can fail at the same time\)`,
      String.raw`\(Y=PAE\) are behavioural conditions that can fail at the same time`,
    ],
    [String.raw`\(Y=PAE gives 0.6Y=300\)`, String.raw`\(Y=PAE\) gives \(0.6Y=300\)`],
    [
      String.raw`\(T=T_0+tY into C=C_0+c(Y-T)\)`,
      String.raw`\(T=T_0+tY\) into \(C=C_0+c(Y-T)\)`,
    ],
    [
      String.raw`\(VMPL=\$60 exceeds W=\$54\)`,
      String.raw`\(VMPL=\$60\) exceeds \(W=\$54\)`,
    ],
    [
      String.raw`\(Y = C + I + G + X - M: the imported laptop appears in C\)`,
      String.raw`\(Y=C+I+G+X-M\): the imported laptop appears in C`,
    ],
    [
      String.raw`\(Y/Y = \Delta A/A + \alpha\Delta K/K + (1-\alpha)\Delta L/L to calculate predicted output growth from the table\)`,
      String.raw`\(Y/Y=\Delta A/A+\alpha\Delta K/K+(1-\alpha)\Delta L/L\) to calculate predicted output growth from the table`,
    ],
    [
      String.raw`\(r\approx i-\pi^e gives r\approx 0\% - (-2\%) = +2\%\)`,
      String.raw`\(r\approx i-\pi^e\) gives \(r\approx 0\%-(-2\%)=+2\%\)`,
    ],
    [
      String.raw`\(r=i-\pi^e can remain too high even when i is near zero\)`,
      String.raw`\(r=i-\pi^e\) can remain too high even when i is near zero`,
    ],
    [
      String.raw`\(r=r^* assumption correctly\)`,
      String.raw`\(r=r^*\) assumption correctly`,
    ],
    [
      String.raw`\(k = 1 / (1 - c + m) to calculate the change in equilibrium output caused by the displayed autonomous-expenditure increase\)`,
      String.raw`\(k=\frac{1}{1-c+m}\) to calculate the change in equilibrium output caused by the displayed autonomous-expenditure increase`,
    ],
    [
      String.raw`\(e = foreign currency per A$\)`,
      String.raw`\(e\) = foreign currency per A$`,
    ],
    [
      String.raw`\(MV=PY is a causal theory that requires no assumptions about velocity or output\)`,
      String.raw`\(MV=PY\) is a causal theory that requires no assumptions about velocity or output`,
    ],
    [
      String.raw`\(MV=PY remains an accounting identity\)`,
      String.raw`\(MV=PY\) remains an accounting identity`,
    ],
    [
      String.raw`\(Y=AE is always true ex post\)`,
      String.raw`\(Y=AE\) is always true ex post`,
    ],
    [
      String.raw`\(Y=PAE is always true ex post\)`,
      String.raw`\(Y=PAE\) is always true ex post`,
    ],
    [
      String.raw`\(Y=PAE are behavioural conditions that can fail at the same time\)`,
      String.raw`\(Y=PAE\) are behavioural conditions that can fail at the same time`,
    ],
    [String.raw`\(AE=Y an identity\)`, String.raw`\(AE=Y\) an identity`],
    [
      String.raw`\(AE=Y is not a behavioural condition that fails\)`,
      String.raw`\(AE=Y\) is not a behavioural condition that fails`,
    ],
    [String.raw`\(CA=S-I toward deficit\)`, String.raw`\(CA=S-I\) toward deficit`],
    [
      String.raw`\(CA=S-I becomes more negative\)`,
      String.raw`\(CA=S-I\) becomes more negative`,
    ],
    [String.raw`\(KFA=-\$25 billion\)`, String.raw`\(KFA=-\$25\) billion`],
    [String.raw`\(KFA=+\$25 billion\)`, String.raw`\(KFA=+\$25\) billion`],
    [String.raw`\(KFA=+\$50 billion\)`, String.raw`\(KFA=+\$50\) billion`],
    [
      String.raw`\(KFA=0 because the current account is negative\)`,
      String.raw`\(KFA=0\) because the current account is negative`,
    ],
    [
      String.raw`\(MPC=.70 means consumption rises by .70\times50=\$35\)`,
      String.raw`With \(MPC=.70\), consumption rises by \(.70\times50=\$35\)`,
    ],
    [
      String.raw`\(i = 4 + 1.5(\pi-\pi^T) + 0.5(output gap)\)`,
      String.raw`\(i=4+1.5(\pi-\pi^T)+0.5\,\text{output gap}\)`,
    ],
    [
      String.raw`\(i=3+1.5(\pi-\pi^T)+0.5(output gap)\)`,
      String.raw`\(i=3+1.5(\pi-\pi^T)+0.5\,\text{output gap}\)`,
    ],
    [
      String.raw`\(r = r̄ + \gamma\pi (or equivalently\)`,
      String.raw`\(r=\bar r+\gamma\pi\) (or equivalently`,
    ],
    [String.raw`\(r=r̄+\gamma\pi\)`, String.raw`\(r=\bar r+\gamma\pi\)`],
    [
      String.raw`\(MV=PY\) itself is an accounting identity, not a causal theory`,
      String.raw`\(MV=PY\) is itself an accounting identity, not a causal theory`,
    ],
    [String.raw`\(Y=PAE: 0.4Y=280-30r\)`, String.raw`\(Y=PAE\): \(0.4Y=280-30r\)`],
    [String.raw`with \(\gamma\)>0`, String.raw`with \(\gamma>0\)`],
    ["PBB = " + "\tilde T - G - TR", String.raw`\(PBB=\tilde{T}-G-TR\)`],
  ];
  return replacements.reduce((value, [from, to]) => value.replaceAll(from, to), text);
}

function repairSplitMathBoundaries(text: string): string {
  let value = text
    .replace(
      String.raw`\(VMPL=p\times MPL\)=$12×5=$60>$54, so the marginal hiring condition supports hiring.`,
      String.raw`\(VMPL=p\times MPL=\$12\times5=\$60>\$54\), so the marginal hiring condition supports hiring.`,
    )
    .replace(
      "Using i = 3 + 1.5(π-πᵀ) + 0.5(output gap), what policy rate follows when π=3%, πᵀ=2%, and the output gap is -2%?",
      String.raw`Using \(i=3+1.5(\pi-\pi^T)+0.5\,\text{output gap}\), what policy rate follows when \(\pi=3\%\), \(\pi^T=2\%\), and the output gap is -2%?`,
    )
    .replace(
      String.raw`1 + \(r = (1+i)/(1+\pi)\), so`,
      String.raw`\(1+r=\frac{1+i}{1+\pi}\), so`,
    )
    .replace(
      String.raw`u - \(u^* = 0.8\) percentage points`,
      String.raw`\(u-u^*=0.8\) percentage points`,
    )
    .replace(String.raw`Y-\(PAE=800-760=\$40\)`, String.raw`\(Y-PAE=800-760=\$40\)`)
    .replace(String.raw`0.25\(Y=200\)`, String.raw`\(0.25Y=200\)`)
    .replace(
      String.raw`\(\Delta\)\(C=0.70\times\$50=\$35\)`,
      String.raw`\(\Delta C=0.70\times\$50=\$35\)`,
    )
    .replace(
      String.raw`\(\Delta\)\(d=[(r-g)/(1+g)]d_t-_1-pbb\)`,
      String.raw`\(\Delta d=\frac{r-g}{1+g}d_{t-1}-pbb\)`,
    )
    .replace(
      String.raw`\(\Delta\)\(d\approx-.00509\)`,
      String.raw`\(\Delta d\approx-.00509\)`,
    )
    .replace(
      String.raw`\(i=4+1.5(\pi-\pi^T)+0.5\,\text{output gap}\), what is i if \(\pi\)=4%, \(\pi^T\)=2%`,
      String.raw`\(i=4+1.5(\pi-\pi^T)+0.5\,\text{output gap}\), what is i if \(\pi=4\%\), \(\pi^T=2\%\)`,
    )
    .replace(
      String.raw`\(i=3+1.5(\pi-\pi^T)+0.5\,\text{output gap}\), what policy rate follows when \(\pi\)=3%, \(\pi^T\)=2%`,
      String.raw`\(i=3+1.5(\pi-\pi^T)+0.5\,\text{output gap}\), what policy rate follows when \(\pi=3\%\), \(\pi^T=2\%\)`,
    )
    .replace(String.raw`\(\pi\)ᵉ`, String.raw`\(\pi^e\)`)
    .replace(String.raw`\(Iᴾ\)`, String.raw`\(I^P\)`)
    .replace(
      String.raw`\(e = foreign currency per A\$\)`,
      String.raw`\(e\) = foreign currency per A$`,
    );

  // Join fragments that the legacy migration split around an operator or
  // comparison. These patterns only apply to already-delimited math, so
  // ordinary prose remains untouched.
  value = value
    .replace(
      /\\\(([^]*?)\\\)\s*([+*/=])\s*\\\(([^]*?)\\\)/gu,
      (_full, left, op, right) => `\\(${left}${op}${right}\\)`,
    )
    .replace(
      /\\\(([^]*?)\\\)\s*-\s*\\\(([^]*?)\\\)/gu,
      (_full, left, right) => `\\(${left}-${right}\\)`,
    )
    .replace(
      /([A-Za-z0-9])\s*[-−]\s*\\\(([^]*?)\\\)/gu,
      (_full, left, right) => `\\(${left}-${right}\\)`,
    )
    .replace(
      /([0-9])\s*<\s*\\\(([^]*?)\\\)\s*<\s*([0-9])/gu,
      (_full, left, middle, right) => `\\(${left}<${middle}<${right}\\)`,
    )
    .replace(
      /\\\(([^]*?)\\\)\s*([=<>≈≤≥])\s*(-?\d+(?:\.\d+)?%?)/gu,
      (_full, expression, operator, number) =>
        `\\(${expression}${operator}${number.replaceAll("%", "\\%")}\\)`,
    )
    .replace(
      /\\\(([^]*?)\\\)\s*×\s*([A-Za-z0-9$.-]+)/gu,
      (_full, expression, operand) =>
        `\\(${expression}\\times ${operand.replaceAll("$", "\\$")}\\)`,
    )
    .replace(/\\\(([^]*?)\\\)ᵉ/gu, (_full, expression) => `\\(${expression}^e\\)`)
    .replace(
      /\\\((\\(?:Delta|delta|pi|alpha|beta|gamma|lambda)|[A-Za-z])\\\)([A-Za-z])/gu,
      (_full, symbol, suffix) => `\\(${symbol}${suffix}\\)`,
    );

  return value;
}

function inlineMath(expression: string): string {
  return `\\(${expression}\\)`;
}

function wrapEquationClauses(text: string): string {
  const lhs = String.raw`(?:[A-Z]{1,8}(?:[A-Z0-9₀₁₂₃₄₅₆₇₈₉₋₊ᴾᵀᴰᴷᴸᵈ]|_\{[^}]+\}|_[A-Za-z0-9]+|\^[A-Za-z0-9{}-]+|\/)*|[a-z](?:[A-Z₀₁₂₃₄₅₆₇₈₉]|_\{[^}]+\}|_[A-Za-z0-9]+|\^[A-Za-z0-9{}-]+|\*)*|[πΔαβγδλμσρΩ](?:[A-Za-z]|_[A-Za-z0-9{}-]+|\^[A-Za-z0-9{}-]+|[₀₁₂₃₄₅₆₇₈₉₋₊ᵃᵅᵝᵀᴮᴷᴰᴸᵈᵉ])* )`;
  const equation = new RegExp(
    String.raw`(?<![A-Za-z\\])(${lhs.trim()}\s*(?:=|≈|≤|≥)\s*(?:(?![,;!?]|\.(?!\d))[^\n]|,(?=\d{3}\b))+?)(?=\s*(?:,(?!\d{3}\b)|\.(?!\d)|;|!|\?|and\b|so\b|with\b|where\b|$))`,
    "gu",
  );
  return text.replace(equation, (value) => {
    const trailing = value.match(
      /\s+(people|units|percentage points|as a fraction|per percentage point)$/u,
    );
    if (trailing === null) return inlineMath(latexifyLegacyToken(value.trim()));
    const expression = value.slice(0, -trailing[0].length).trimEnd();
    return `${inlineMath(latexifyLegacyToken(expression))}${trailing[0]}`;
  });
}

function wrapLegacyMathTokens(text: string): string {
  const token =
    /(?<![A-Za-z\\])(?:\\(?:tilde|hat|bar)\s*[A-Za-z](?:_\{[^}]+\}|_[A-Za-z0-9]+)?|[A-Za-z]{1,8}(?:_\{[^}]+\}|_[A-Za-z0-9]+|\^[^\s,.;!?]+)+|[A-Za-zπΔαβγδλμσρΩ][₀₁₂₃₄₅₆₇₈₉₋₊ₐₑₒₓₙₚₛₜₕᵃᵅᵝᵀᴮᴰᴷᴸᵈᴾ²³]+|[πΔαβγδλμσρΩ](?:\^[A-Za-z0-9{}-]+)?)(?![A-Za-z])/gu;
  return text.replace(token, (value) => inlineMath(latexifyLegacyToken(value)));
}

function latexifyLegacyToken(token: string): string {
  let value = token
    .replaceAll("π", "\\pi")
    .replaceAll("Δ", "\\Delta")
    .replaceAll("α", "\\alpha")
    .replaceAll("β", "\\beta")
    .replaceAll("γ", "\\gamma")
    .replaceAll("δ", "\\delta")
    .replaceAll("λ", "\\lambda")
    .replaceAll("ε", "\\varepsilon")
    .replaceAll("≈", "\\approx")
    .replaceAll("×", "\\times")
    .replaceAll("−", "-")
    .replaceAll("ᵀ", "^T")
    .replaceAll("ᴮ", "^B")
    .replaceAll("ᴷ", "_K")
    .replaceAll("ᴰ", "^D")
    .replaceAll("ᴸ", "^L")
    .replaceAll("ᵉ", "^e")
    .replaceAll("ᵃ", "^a")
    .replaceAll("ᵅ", "^a")
    .replaceAll("ᵝ", "^b")
    .replaceAll("ᵈ", "^d")
    .replaceAll("₀", "_0")
    .replaceAll("₁", "_1")
    .replaceAll("₂", "_2")
    .replaceAll("₃", "_3")
    .replaceAll("₄", "_4")
    .replaceAll("₅", "_5")
    .replaceAll("₆", "_6")
    .replaceAll("₇", "_7")
    .replaceAll("₈", "_8")
    .replaceAll("₉", "_9")
    .replaceAll("ₜ", "_t")
    .replaceAll("ₕ", "_h")
    .replaceAll("ₙ", "_n")
    .replaceAll("ₚ", "_p")
    .replaceAll("ₛ", "_s")
    .replaceAll("₋", "-")
    .replaceAll("₊", "+");
  value = value
    .replace(/([A-Za-zπΔαβγδλμσρΩ])ₜ₋₁/gu, "$1_{t-1}")
    .replace(/([A-Za-zπΔαβγδλμσρΩ])ₜ/gu, "$1_t")
    .replace(/([A-Za-zπΔαβγδλμσρΩ])₍ₜ₋₁₎/gu, "$1_{t-1}")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replace(/([A-Za-z])\*/gu, "$1^*");
  value = value.replace(/\^\(([^)]*)\)/gu, "^{$1}");
  value = value.replace(/\^([0-9]+(?:\.[0-9]+)?)/gu, "^{$1}");
  value = value.replace(/(?<=\d),(?=\d{3}\b)/gu, "{,}");
  value = value.replace(
    /\\(frac|times|approx|le|ge|Delta|alpha|beta|gamma|delta|lambda|varepsilon|epsilon|theta)(?=[A-Za-z])/gu,
    "\\$1 ",
  );
  value = value.replaceAll("$", "\\$");
  value = value.replace(/(^|[^\\])%/gu, "$1\\%");
  return value;
}
