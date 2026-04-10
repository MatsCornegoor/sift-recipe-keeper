// Deterministic scoring of an extracted recipe against a ground-truth entry.
// No AI calls — purely string matching and structural checks.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordSet(str) {
  return new Set(
    String(str ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(s => s.length > 1)
  );
}

function jaccardOverlap(a, b) {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  const intersection = [...setA].filter(x => setB.has(x)).length;
  return intersection / new Set([...setA, ...setB]).size;
}

function bestOverlap(item, candidates) {
  if (candidates.length === 0) return 0;
  return Math.max(...candidates.map(c => jaccardOverlap(item, c)));
}

function flattenItems(groups) {
  return (groups ?? []).flatMap(g => g.items ?? []);
}

const GENERIC_TITLES = new Set(['ingredients', 'ingredient', 'instructions', 'instruction', 'directions', 'method', 'steps']);

// ─── Category scorers ─────────────────────────────────────────────────────────

function scoreName(extracted, gt) {
  const mistakes = [];
  const similarity = jaccardOverlap(extracted.name ?? '', gt.name ?? '');
  const score = Math.round(similarity * 10);
  if (score < 8) mistakes.push(`Name "${extracted.name}" differs from expected "${gt.name}"`);
  return { score, mistakes };
}

function scoreIngredients(extracted, gt) {
  const gtItems = flattenItems(gt.ingredientsGroups);
  const exItems = flattenItems(extracted.ingredientsGroups);
  const mistakes = [];

  if (gtItems.length === 0) return { score: 10, mistakes: [] };

  // Coverage: fraction of gt ingredients with a close match in extracted
  let matched = 0;
  for (const gtItem of gtItems) {
    if (bestOverlap(gtItem, exItems) >= 0.25) {
      matched++;
    } else {
      mistakes.push(`Missing ingredient: "${gtItem}"`);
    }
  }
  const coverage = matched / gtItems.length;

  // Hallucination penalty: extracted items with no match in gt
  let hallucinations = 0;
  for (const exItem of exItems) {
    if (bestOverlap(exItem, gtItems) < 0.2) hallucinations++;
  }
  if (hallucinations > 0) mistakes.push(`${hallucinations} ingredient(s) not found in source`);

  const score = Math.max(0, Math.min(10, Math.round(coverage * 10) - Math.min(3, hallucinations)));
  return { score, mistakes };
}

function scoreInstructions(extracted, gt) {
  const gtItems = flattenItems(gt.instructionGroups);
  const exItems = flattenItems(extracted.instructionGroups);
  const mistakes = [];

  if (gtItems.length === 0) return { score: 10, mistakes: [] };

  // Step count ratio (0-5 points)
  const countRatio = Math.min(exItems.length, gtItems.length) / Math.max(exItems.length, gtItems.length);
  const countScore = countRatio * 5;
  if (countRatio < 0.7) {
    mistakes.push(`Step count mismatch: extracted ${exItems.length}, expected ~${gtItems.length}`);
  }

  // Combined text overlap (0-5 points)
  const gtText = gtItems.join(' ');
  const exText = exItems.join(' ');
  const textScore = jaccardOverlap(gtText, exText) * 5;

  const score = Math.round(countScore + textScore);
  return { score, mistakes };
}

function scoreMetadata(extracted, gt) {
  const fields = ['cookingTime', 'servings', 'calories'];
  const mistakes = [];
  let score = 0;

  for (const field of fields) {
    const gtVal = (gt[field] ?? '').trim();
    const exVal = (extracted[field] ?? '').trim();
    const gtHas = gtVal !== '';
    const exHas = exVal !== '';

    if (gtHas && exHas) {
      score += 3; // both present
    } else if (!gtHas && !exHas) {
      score += 3; // both correctly empty
    } else if (!gtHas && exHas) {
      mistakes.push(`${field} hallucinated: source is empty but "${exVal}" was extracted`);
    } else {
      score += 1; // partial credit — tried but missed
      mistakes.push(`${field} missing: expected "${gtVal}"`);
    }
  }

  // 1 bonus point if schemaVersion is correct
  if (extracted.schemaVersion === 2) score += 1;

  return { score: Math.min(10, score), mistakes };
}

function scoreSchema(extracted, gt) {
  const mistakes = [];
  let score = 10;

  // Required fields
  for (const field of ['name', 'ingredientsGroups', 'instructionGroups', 'tags']) {
    if (extracted[field] === undefined || extracted[field] === null) {
      mistakes.push(`Missing field: "${field}"`);
      score -= 2;
    }
  }

  // No generic group titles
  const allGroups = [...(extracted.ingredientsGroups ?? []), ...(extracted.instructionGroups ?? [])];
  for (const group of allGroups) {
    const title = (group.title ?? '').toLowerCase().trim();
    if (title && GENERIC_TITLES.has(title)) {
      mistakes.push(`Generic group title: "${group.title}"`);
      score -= 2;
      break;
    }
  }

  // Tags count
  const tagCount = (extracted.tags ?? []).length;
  if (tagCount < 3 || tagCount > 5) {
    mistakes.push(`Expected 3-5 tags, got ${tagCount}`);
    score -= 1;
  }

  return { score: Math.max(0, score), mistakes };
}

// ─── Main export ──────────────────────────────────────────────────────────────

// Scores an extracted recipe against a ground-truth recipe.
// Returns { scores: { name, ingredients, instructions, metadata, schema }, total, mistakes }.
function scoreAgainstDataset(extracted, groundTruth) {
  const results = {
    name: scoreName(extracted, groundTruth),
    ingredients: scoreIngredients(extracted, groundTruth),
    instructions: scoreInstructions(extracted, groundTruth),
    metadata: scoreMetadata(extracted, groundTruth),
    schema: scoreSchema(extracted, groundTruth),
  };

  const scores = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.score]));
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const mistakes = Object.values(results).flatMap(r => r.mistakes);

  return { scores, total, mistakes };
}

module.exports = { scoreAgainstDataset };
