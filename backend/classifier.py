"""Lightweight rule-based classifier for room detection."""

import re

# Keywords for each room
CODE_PATTERNS = [
    r'\bcode\b', r'\bpython\b', r'\bjavascript\b', r'\bfunction\b', r'\bdebug\b',
    r'\berror\b', r'\bbug\b', r'\bfix\b', r'\bapi\b', r'\bclass\b', r'\bloop\b',
    r'\brecursion\b', r'\bsyntax\b', r'\bimport\b', r'```', r'\balgorithm\b',
    r'\bvariable\b', r'\bmethod\b', r'\bcompile\b', r'\bexception\b'
]

STUDY_PATTERNS = [
    r'\bexplain\b', r'\bsolve\b', r'\bdefine\b', r'\bhow does\b', r'\bwhat is\b',
    r'\btutorial\b', r'\blearn\b', r'\bteach\b', r'\bderive\b', r'\bproof\b',
    r'\bnotes\b', r'\btheory\b', r'\bunderstand\b', r'\bconcept\b', r'\bdeadlock\b',
    r'\bprocess\b', r'\bformula\b', r'\bcalculate\b', r'\bwork\b'
]

CREATIVE_PATTERNS = [
    r'\bcaption\b', r'\bscript\b', r'\bad[- ]copy\b', r'\blogo\b', r'\bcontent\b',
    r'\bcreative\b', r'\bwrite a\b', r'\bstory\b', r'\bpoem\b', r'\breel\b',
    r'\binstagram\b', r'\bblog\b', r'\barticle\b', r'\bslogan\b', r'\btagline\b',
    r'\bbranding\b', r'\bidea\b', r'\bgenerate.*text\b'
]

DECISION_PATTERNS = [
    r'\bshould i\b', r'\bwhich\b', r'\bbest\b', r'\brecommend\b', r'\bversus\b',
    r'\bvs\b', r'\bcompare\b', r'\bchoose\b', r'\bpick\b', r'\bbetter\b',
    r'\bor\b.*\bor\b', r'\boption\b', r'\bdecide\b', r'\badvice\b', r'\blaptop\b',
    r'\bphone\b', r'\bproduct\b'
]


def detect_room(prompt: str) -> str:
    """
    Detect the most appropriate room for a given prompt.
    
    Args:
        prompt: User's input prompt
        
    Returns:
        Room identifier: 'code', 'study', 'creative', or 'decision'
    """
    prompt_lower = prompt.lower()
    
    # Count matches for each room
    scores = {
        'code': sum(1 for pattern in CODE_PATTERNS if re.search(pattern, prompt_lower, re.IGNORECASE)),
        'study': sum(1 for pattern in STUDY_PATTERNS if re.search(pattern, prompt_lower, re.IGNORECASE)),
        'creative': sum(1 for pattern in CREATIVE_PATTERNS if re.search(pattern, prompt_lower, re.IGNORECASE)),
        'decision': sum(1 for pattern in DECISION_PATTERNS if re.search(pattern, prompt_lower, re.IGNORECASE))
    }
    
    # Get room with highest score
    detected_room = max(scores.items(), key=lambda x: x[1])
    
    # If no strong signals, default to decision room
    if detected_room[1] == 0:
        return 'decision'
    
    return detected_room[0]
