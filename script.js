const expressionDisplay = document.querySelector("#expression");
const valueDisplay = document.querySelector("#display");
const previewDisplay = document.querySelector("#preview");
const calculatorKeys = document.querySelector(".calculator-card");

let expression = "0";
let hasCalculated = false;
let hasError = false;
let lastExpression = "";

function formatResult(value) {
  if (!Number.isFinite(value)) {
    throw new Error("Result is too large to display.");
  }

  if (Object.is(value, -0)) {
    return "0";
  }

  return Number(value.toPrecision(12)).toString();
}

function tokenize(input) {
  const tokens = [];
  const tokenPattern = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([+\-*/]))/gy;
  let position = 0;

  while (position < input.length) {
    tokenPattern.lastIndex = position;
    const match = tokenPattern.exec(input);

    if (!match) {
      throw new Error("Invalid expression.");
    }

    tokens.push(match[1] ?? match[2]);
    position = tokenPattern.lastIndex;
  }

  if (tokens.length === 0) {
    throw new Error("Invalid expression.");
  }

  return tokens;
}

function evaluateExpression(input) {
  const tokens = tokenize(input);
  let position = 0;

  function parsePrimary() {
    const token = tokens[position];

    if (token === "+" || token === "-") {
      position += 1;
      const value = parsePrimary();
      return token === "-" ? -value : value;
    }

    if (token === undefined || /^[+\-*/]$/.test(token)) {
      throw new Error("Invalid expression.");
    }

    position += 1;
    const value = Number(token);

    if (!Number.isFinite(value)) {
      throw new Error("Invalid expression.");
    }

    return value;
  }

  function parseTerm() {
    let value = parsePrimary();

    while (tokens[position] === "*" || tokens[position] === "/") {
      const operator = tokens[position];
      position += 1;
      const right = parsePrimary();

      if (operator === "/" && right === 0) {
        throw new Error("Cannot divide by zero.");
      }

      value = operator === "*" ? value * right : value / right;

      if (!Number.isFinite(value)) {
        throw new Error("Result is too large to display.");
      }
    }

    return value;
  }

  function parseExpression() {
    let value = parseTerm();

    while (tokens[position] === "+" || tokens[position] === "-") {
      const operator = tokens[position];
      position += 1;
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;

      if (!Number.isFinite(value)) {
        throw new Error("Result is too large to display.");
      }
    }

    return value;
  }

  const result = parseExpression();

  if (position !== tokens.length) {
    throw new Error("Invalid expression.");
  }

  return result;
}

function prettyExpression(input) {
  return input
    .replaceAll("*", "\u00d7")
    .replaceAll("/", "\u00f7")
    .replaceAll("-", "\u2212");
}

function getCurrentNumber() {
  const match = expression.match(/(?:^|[+\-*/])((?:\d+\.?\d*|\.\d+))$/);
  return match ? match[1] : "";
}

function updateDisplay() {
  expressionDisplay.textContent = prettyExpression(
    hasCalculated ? lastExpression : expression
  );

  if (hasError) {
    valueDisplay.textContent = hasError;
    valueDisplay.classList.add("text-rose-300");
    previewDisplay.textContent = "";
  } else {
    valueDisplay.classList.remove("text-rose-300");
    valueDisplay.textContent = getCurrentNumber() || "0";

    const endsWithOperator = /[+\-*/]$/.test(expression);

    if (hasCalculated || endsWithOperator) {
      previewDisplay.textContent = "";
    } else {
      try {
        previewDisplay.textContent =
          `= ${formatResult(evaluateExpression(expression))}`;
      } catch {
        previewDisplay.textContent = "";
      }
    }
  }

  valueDisplay.classList.remove("updated");
  void valueDisplay.offsetWidth;
  valueDisplay.classList.add("updated");
}

function resetCalculator() {
  expression = "0";
  hasCalculated = false;
  hasError = false;
  lastExpression = "";
  updateDisplay();
}

function enterDigit(digit) {
  if (hasError || hasCalculated) {
    expression = "0";
    hasError = false;
    hasCalculated = false;
    lastExpression = "";
  }

  expression = expression === "0" ? digit : expression + digit;
  updateDisplay();
}

function enterDecimal() {
  if (hasError || hasCalculated) {
    expression = "0";
    hasError = false;
    hasCalculated = false;
    lastExpression = "";
  }

  const currentNumber = getCurrentNumber();

  if (currentNumber.includes(".")) {
    return;
  }

  if (/[+\-*/]$/.test(expression)) {
    expression += "0.";
  } else if (expression === "0") {
    expression = "0.";
  } else {
    expression += ".";
  }

  updateDisplay();
}

function enterOperator(operator) {
  if (hasError) {
    resetCalculator();
  }

  if (hasCalculated) {
    hasCalculated = false;
    lastExpression = "";
  }

  if (expression === "0" || expression === "") {
    if (operator === "-") {
      expression = "-";
      updateDisplay();
    }
    return;
  }

  if (/[+\-*/]$/.test(expression)) {
    const previousOperator = expression.at(-1);
    const beforePrevious = expression.at(-2);

    if (operator === "-" && previousOperator !== "-") {
      expression += operator;
    } else if (
      previousOperator === "-" &&
      /[+\-*/]/.test(beforePrevious ?? "")
    ) {
      expression = expression.slice(0, -2);

      if (expression && !/[+\-*/]$/.test(expression)) {
        expression += operator;
      }
    } else {
      expression = expression.slice(0, -1) + operator;
    }
  } else {
    expression += operator;
  }

  updateDisplay();
}

function calculate() {
  if (hasError || /[+\-*/]$/.test(expression)) {
    return;
  }

  try {
    lastExpression = expression;
    expression = formatResult(evaluateExpression(expression));
    hasCalculated = true;
    hasError = false;
  } catch (error) {
    hasError = error instanceof Error
      ? error.message
      : "Invalid expression.";
    hasCalculated = false;
  }

  updateDisplay();
}

function deleteLastCharacter() {
  if (hasError) {
    resetCalculator();
    return;
  }

  if (hasCalculated) {
    hasCalculated = false;
    lastExpression = "";
  }

  expression = expression.length > 1
    ? expression.slice(0, -1)
    : "0";

  if (expression === "" || expression === "-") {
    expression = "0";
  }

  updateDisplay();
}

function applyPercent() {
  if (hasError) {
    resetCalculator();
    return;
  }

  const match = expression.match(/(?:\d+\.?\d*|\.\d+)$/);

  if (!match) {
    return;
  }

  const start = match.index;
  const percentage = formatResult(Number(match[0]) / 100);
  expression = expression.slice(0, start) + percentage;
  hasCalculated = false;
  lastExpression = "";
  updateDisplay();
}

function handleAction(action) {
  switch (action) {
    case "clear":
      resetCalculator();
      break;
    case "delete":
      deleteLastCharacter();
      break;
    case "decimal":
      enterDecimal();
      break;
    case "equals":
      calculate();
      break;
    case "percent":
      applyPercent();
      break;
  }
}

calculatorKeys.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  if (button.dataset.number !== undefined) {
    enterDigit(button.dataset.number);
  } else if (button.dataset.operator) {
    enterOperator(button.dataset.operator);
  } else if (button.dataset.action) {
    handleAction(button.dataset.action);
  }
});

document.addEventListener("keydown", (event) => {
  if (/^\d$/.test(event.key)) {
    enterDigit(event.key);
  } else if (event.key === ".") {
    enterDecimal();
  } else if (["+", "-", "*", "/"].includes(event.key)) {
    enterOperator(event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    calculate();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    deleteLastCharacter();
  } else if (event.key === "Escape") {
    resetCalculator();
  } else if (event.key === "%") {
    applyPercent();
  }
});

updateDisplay();