"""Builds the sample import spreadsheets in docs/samples/ for the QA Portal.

1. test-cases-sample.xlsx        - ~40 valid cases for a web shop; imports cleanly.
2. test-cases-with-problems.xlsx - every kind of problem the "Check rows" step reports.
"""
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)

FONT = "Arial"
HEADERS = [
    "Title", "Suite", "Priority", "Type", "Status", "Labels",
    "References", "Preconditions", "Steps", "Expected results",
]
WIDTHS = [44, 28, 10, 13, 9, 26, 16, 34, 52, 52]


def numbered(lines):
    return "\n".join(f"{i}. {line}" for i, line in enumerate(lines, 1) if line is not None)


def expected(lines):
    # Blank expected results are allowed; keep each one on its step's number.
    return "\n".join(f"{i}. {line}" for i, line in enumerate(lines, 1) if line)


def case(title, suite, priority, ctype, status, labels, refs, pre, steps):
    actions = [s[0] for s in steps]
    results = [s[1] for s in steps]
    return [title, suite, priority, ctype, status, labels, refs, pre,
            numbered(actions), expected(results)]


CASES = [
    # --- Account › Sign-in ----------------------------------------------------
    case("Sign in with a valid username and password", "Account › Sign-in", "Critical", "Functional", "Ready",
         "smoke, automated", "WEB-101", "An active customer account exists.",
         [("Open the sign-in page", "Username and password fields are shown"),
          ("Enter a valid username and password and choose Sign in", "The home page opens and shows the customer's name")]),
    case("Wrong password shows an error and no details leak", "Account › Sign-in", "Critical", "Security", "Ready",
         "regression", "WEB-102", "An active customer account exists.",
         [("Enter a valid username with a wrong password", ""),
          ("Choose Sign in", "“Username or password is wrong” is shown; it doesn't say which one")]),
    case("Account locks after 5 failed sign-ins", "Account › Sign-in", "High", "Security", "Ready",
         "regression", "WEB-103", "An active customer account exists.",
         [("Enter a wrong password 5 times", "After the 5th try the account is locked for 15 minutes"),
          ("Enter the right password", "Sign-in is still refused until the lock ends")]),
    case("Remember me keeps the customer signed in", "Account › Sign-in", "Medium", "Functional", "Ready",
         "", "", "",
         [("Sign in with Remember me ticked", ""),
          ("Close and reopen the browser", "The customer is still signed in")]),
    case("Sign out ends the session", "Account › Sign-in", "High", "Security", "Ready",
         "smoke", "", "Signed in as a customer.",
         [("Choose Sign out from the account menu", "The sign-in page opens"),
          ("Press the browser's Back button", "Account pages ask the customer to sign in again")]),
    case("Sign-in form works with the keyboard only", "Account › Sign-in", "Medium", "Usability", "Draft",
         "accessibility", "", "",
         [("Tab through the sign-in form", "Focus moves Username → Password → Sign in and is always visible"),
          ("Press Enter in the Password field", "The form is submitted")]),
    # --- Account › Registration ---------------------------------------------
    case("Register a new account", "Account › Registration", "Critical", "Functional", "Ready",
         "smoke", "WEB-110", "The email address isn't registered yet.",
         [("Open Create account and fill in every field", ""),
          ("Choose Create account", "A confirmation email is sent"),
          ("Open the link in the email", "The account is active and the customer is signed in")]),
    case("Reject a password shorter than 12 characters", "Account › Registration", "High", "Security", "Ready",
         "regression", "WEB-111", "",
         [("Enter an 8-character password and choose Create account", "“Use at least 12 characters” shows under the field")]),
    case("Reject an email that is already registered", "Account › Registration", "Medium", "Functional", "Ready",
         "", "WEB-112", "An account with jo@example.com exists.",
         [("Register with jo@example.com", "“An account with this email already exists” is shown, with a Sign in link")]),
    # --- Account (no sub-suite) ------------------------------------------------
    case("Update the delivery address in the profile", "Account", "Medium", "Functional", "Ready",
         "", "", "Signed in as a customer.",
         [("Open Profile › Addresses and edit the default address", ""),
          ("Save", "The new address shows and is used at checkout")]),
    case("Profile page shows no other customer's data", "Account", "Critical", "Security", "Ready",
         "regression", "SEC-14", "Two customer accounts, A and B.",
         [("Sign in as A and open Profile", "Only A's details show"),
          ("Change the profile ID in the URL to B's", "A 404 page is shown")]),
    # --- Catalogue › Search ---------------------------------------------------
    case("Search finds products by name", "Catalogue › Search", "High", "Functional", "Ready",
         "smoke, automated", "WEB-201", "",
         [("Type “trainers” in the search box", "Suggestions appear after 2 characters"),
          ("Press Enter", "Results list products with “trainers” in the name")]),
    case("Search with no results suggests alternatives", "Catalogue › Search", "Low", "Usability", "Ready",
         "", "", "",
         [("Search for “xqzv”", "“No products found” shows with popular categories")]),
    case("Filter results by price and size", "Catalogue › Search", "Medium", "Functional", "Ready",
         "regression", "WEB-203", "",
         [("Search for “trainers”", ""),
          ("Set price £20–£50 and size 9", "Only matching products show; the count updates"),
          ("Clear the filters", "All results show again")]),
    case("Search results load in under 2 seconds", "Catalogue › Search", "Medium", "Performance", "Ready",
         "automated", "", "Throttled to “Fast 4G” in dev tools.",
         [("Search for “shirt”", "Results are usable within 2 seconds")]),
    # --- Catalogue › Product page -------------------------------------------
    case("Product page shows price, stock and images", "Catalogue › Product page", "High", "Functional", "Ready",
         "smoke", "WEB-210", "",
         [("Open any product", "Name, price, stock status and at least one image show"),
          ("Choose another image", "The large image changes")]),
    case("Out-of-stock product can't be added to the cart", "Catalogue › Product page", "High", "Functional", "Ready",
         "regression", "WEB-211", "A product with 0 stock.",
         [("Open the product", "“Out of stock” shows and Add to cart is disabled"),
          ("Choose Email me when it's back", "A confirmation shows")]),
    case("Product images have text alternatives", "Catalogue › Product page", "Medium", "Usability", "Draft",
         "accessibility", "", "",
         [("Inspect the product images with a screen reader", "Each image has a description of what it shows")]),
    # --- Cart -----------------------------------------------------------------
    case("Add a product to the cart", "Cart", "Critical", "Functional", "Ready",
         "smoke, automated", "WEB-301", "",
         [("Open a product and choose Add to cart", "The cart icon shows 1"),
          ("Open the cart", "The product, price and quantity 1 are listed")]),
    case("Change the quantity in the cart", "Cart", "High", "Functional", "Ready",
         "regression", "", "One product priced £20.00 in the cart.",
         [("Set the quantity to 3", "The line total shows £60.00"),
          ("Reload the page", "Quantity and totals are kept")]),
    case("Remove the last item empties the cart", "Cart", "Low", "Functional", "Ready",
         "", "", "One product in the cart.",
         [("Choose Remove", "“Your cart is empty” shows with a link to the shop"),
          ("Check the cart icon", "The count badge is gone")]),
    case("Apply a 10% discount code", "Cart", "Medium", "Functional", "Ready",
         "regression", "WEB-305", "Code SAVE10 is active.",
         [("Enter SAVE10 and choose Apply", "A −10% line shows under the subtotal"),
          ("Check the total", "Total = subtotal − 10% + delivery")]),
    case("Expired discount code is refused", "Cart", "Medium", "Functional", "Ready",
         "", "WEB-306", "Code OLD5 expired yesterday.",
         [("Enter OLD5 and choose Apply", "“This code has expired” shows; the total doesn't change")]),
    case("Cart is kept after signing in", "Cart", "Medium", "Functional", "Draft",
         "", "", "Signed out, with 2 products in the cart.",
         [("Sign in", "The cart still holds the 2 products"),
          ("Sign out and sign in on another browser", "The cart shows the same products")]),
    # --- Checkout › Delivery --------------------------------------------------
    case("Choose standard delivery", "Checkout › Delivery", "High", "Functional", "Ready",
         "smoke", "WEB-401", "Signed in, with one product in the cart.",
         [("Choose Checkout", "The delivery step shows the saved address"),
          ("Choose Standard (3–5 days)", "The delivery cost is added to the total")]),
    case("Free delivery over £50", "Checkout › Delivery", "Medium", "Functional", "Ready",
         "regression", "WEB-402", "Cart total £55.00.",
         [("Go to the delivery step", "Standard delivery shows as Free")]),
    case("Click and collect hides the address form", "Checkout › Delivery", "Low", "Usability", "Draft",
         "", "", "",
         [("Choose Click and collect", "The address form is hidden and a store picker shows"),
          ("Choose a store", "Its opening hours show")]),
    # --- Checkout › Payment ---------------------------------------------------
    case("Pay with a saved card", "Checkout › Payment", "Critical", "Functional", "Ready",
         "smoke, checkout-critical", "PAY-1203", "A saved Visa card ending 4242.",
         [("Choose the saved card and Pay", "A spinner shows and Pay is disabled"),
          ("Wait for the confirmation page", "The order number shows; the card is charged once")]),
    case("Declined card shows a retry message", "Checkout › Payment", "Critical", "Functional", "Ready",
         "regression, checkout-critical", "PAY-1188", "Test card 4000 0000 0000 0002 (always declined).",
         [("Pay with the declined card", "No order is created"),
          ("Read the message", "“Your card was declined. Try another card.” shows by the card field"),
          ("Pay with another card", "The order completes")]),
    case("3-D Secure challenge completes the order", "Checkout › Payment", "High", "Functional", "Ready",
         "regression", "PAY-1240", "Test card 4000 0027 6000 3184 (needs 3-D Secure).",
         [("Pay with the 3-D Secure card", "The bank's challenge window opens"),
          ("Choose Complete authentication", "The window closes"),
          ("Wait for the confirmation page", "The order shows as Paid")]),
    case("Card number is masked on receipts", "Checkout › Payment", "Critical", "Security", "Ready",
         "checkout-critical", "SEC-88", "A paid order exists.",
         [("Open the receipt email and PDF", "Only the last 4 digits of the card show")]),
    case("Double-clicking Pay charges only once", "Checkout › Payment", "Critical", "Functional", "Ready",
         "regression, checkout-critical", "PAY-1260", "",
         [("Double-click Pay quickly", "One order is created and the card is charged once")]),
    case("Pay with PayPal", "Checkout › Payment", "High", "Functional", "Draft",
         "smoke", "PAY-1350", "A PayPal sandbox buyer account.",
         [("Choose PayPal and sign in to the sandbox", "PayPal shows the order total"),
          ("Approve the payment", "You return to the confirmation page")]),
    # --- Orders ---------------------------------------------------------------
    case("Order history lists past orders newest first", "Orders", "Medium", "Functional", "Ready",
         "", "WEB-501", "A customer with 3 past orders.",
         [("Open Account › Orders", "3 orders show, newest first, with status and total")]),
    case("Cancel an order before it ships", "Orders", "High", "Functional", "Ready",
         "regression", "WEB-502", "A paid order with status Processing.",
         [("Open the order and choose Cancel order", "A confirmation asks for a reason"),
          ("Confirm", "The status is Cancelled and a refund is started"),
          ("Check email", "A cancellation email arrives")]),
    case("Shipped orders can't be cancelled", "Orders", "Medium", "Functional", "Ready",
         "", "", "An order with status Shipped.",
         [("Open the order", "Cancel order isn't shown; Return items is")]),
    case("Track a shipped order", "Orders", "Low", "Functional", "Ready",
         "", "", "An order with status Shipped.",
         [("Choose Track parcel", "The carrier's tracking page opens in a new tab")]),
    case("Orders page loads in under 2 seconds with 200 orders", "Orders", "Medium", "Performance", "Draft",
         "", "", "A customer with 200 past orders.",
         [("Open Account › Orders", "The first page is usable within 2 seconds")]),
    # --- No suite (goes to the import's default suite) ------------------------
    case("Cookie banner choice is remembered", "", "Low", "Other", "Ready",
         "", "LEG-7", "A fresh browser with no cookies.",
         [("Choose Reject non-essential", "The banner closes"),
          ("Reload the page", "The banner doesn't come back")]),
    case("Site works in the latest Chrome, Firefox, Safari and Edge", "", "Medium", "Other", "Draft",
         "", "", "",
         [("Run the smoke-labelled cases in each browser", "All pass"),
          ("Note any layout differences", None)]),
]

PROBLEM_HEADERS = ["ID", "Test name", "Section", "Priority", "Category", "State",
                   "Tags", "Jira", "Steps", "Expected", "Owner"]
PROBLEM_WIDTHS = [11, 40, 30, 10, 12, 11, 20, 11, 40, 40, 10]

# Each row: (cells..., what the check step should say)
PROBLEMS = [
    (["WEB-TC-1", "Pay with Apple Pay on Safari", "checkout / payment", "Urgent", "Smoke", "Approved",
      "wallet, mobile", "PAY-1402", "1. Choose Apple Pay\n2. Confirm with Face ID",
      "1. The Apple Pay sheet shows the total\n2. The confirmation page shows", "Marco"],
     "Fine after value matching: Urgent → Critical, Smoke → Functional + label “smoke”, Approved → Ready. "
     "A note says “checkout” matched Checkout if that suite already exists. The ID and Owner columns are ignored."),
    (["WEB-TC-2", "Pay with Google Pay on Chrome", "Checkout › Payment", "P1", "Functional", "Ready",
      "", "", "1. Choose Google Pay\n2. Confirm", "2. The confirmation page shows", "Ana"],
     "Fine: P1 → High; step 1 has no expected result, which is allowed."),
    (["", "", "Checkout", "Medium", "Functional", "", "", "", "Do it", "", "Ana"],
     "ERROR: Title is empty."),
    (["", "Apple Pay on iPad", "Checkout › Payment › Wallets", "Low", "Functional", "", "", "", "Pay", "", "Ana"],
     "ERROR: Suite is nested too deep (one sub-suite level only)."),
    (["", "Upgrade plan charges the difference", "Subscriptions", "P2", "Functional", "", "", "",
      "1. Open Plans\n2. Choose Premium", "1. Plans show\n2. Premium is selected\n3. The difference is charged", "Ana"],
     "ERROR: Expected result 3 has no matching step 3. (Subscriptions would be a new suite.)"),
    (["", "Gift card balance is applied", "Cart", "High", "Functional", "", "gift card!", "", "Apply a gift card", "", "Ana"],
     "ERROR: Label “gift card!” can only use letters, digits, dots, dashes or underscores."),
    (["", "Pay with Google Pay on Chrome", "Checkout › Payment", "High", "Functional", "", "", "", "Choose Google Pay", "", "Ana"],
     "WARNING: same title as row 3 in this file. It is still imported as a new case."),
    (["", "Monthly plan renews on the same day", "Subscriptions", "Blocker", "Functional", "In review", "", "",
      "Wait for the renewal date", "The card is charged and an invoice email arrives", "Ana"],
     "Fine after value matching: Blocker → Critical, “In review” → Draft. Subscriptions is a new suite."),
    (["", "=HYPERLINK(\"http://example.com\",\"Click\")", "Cart", "Low", "Functional", "", "", "",
      "Check the title is stored as plain text", "", "Ana"],
     "Fine: a formula-looking title is imported as plain text, not run."),
    (["", "Search finds products by name", "Catalogue › Search", "High", "Functional", "Ready", "", "",
      "Search for “trainers”", "Results show", "Ana"],
     "WARNING if the clean sample was imported first: an active case already has this title in this suite."),
]

HEADER_FILL = PatternFill("solid", start_color="1F4E78")
NOTE_FILL = PatternFill("solid", start_color="FFF2CC")


def style_sheet(ws, headers, widths):
    for col, (name, width) in enumerate(zip(headers, widths), 1):
        cell = ws.cell(row=1, column=col, value=name)
        cell.font = Font(name=FONT, bold=True, color="FFFFFF")
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(vertical="center", wrap_text=True)
        ws.column_dimensions[cell.column_letter].width = width
    ws.freeze_panes = "A2"


def body_cell(cell):
    # openpyxl stores text starting with "=" as a formula; keep it as plain text.
    if isinstance(cell.value, str) and cell.value.startswith("="):
        cell.data_type = "s"
    cell.font = Font(name=FONT)
    cell.alignment = Alignment(vertical="top", wrap_text=True)


def how_to_sheet(wb, lines):
    ws = wb.create_sheet("How to use")
    ws.column_dimensions["A"].width = 110
    for i, (text, bold) in enumerate(lines, 1):
        cell = ws.cell(row=i, column=1, value=text)
        cell.font = Font(name=FONT, bold=bold, size=12 if bold else 10)
        cell.alignment = Alignment(wrap_text=True, vertical="top")


# --- 1. Clean sample ----------------------------------------------------------
wb = Workbook()
ws = wb.active
ws.title = "Test cases"
style_sheet(ws, HEADERS, WIDTHS)
for r, row in enumerate(CASES, 2):
    for c, value in enumerate(row, 1):
        body_cell(ws.cell(row=r, column=c, value=value))
ws.cell(row=1, column=1).comment = Comment(
    "Only Title is required. Edit any cell; keep the header row as it is.", "QA Portal")
how_to_sheet(wb, [
    ("Sample test cases for the QA Portal import", True),
    (f"The “Test cases” sheet holds {len(CASES)} cases for a web shop. Import it into any project from "
     "Test cases › Import; it should report no errors.", False),
    ("", False),
    ("Columns", True),
    ("Title (required) · Suite · Priority · Type · Status · Labels · References · Preconditions · Steps · Expected results", False),
    ("Suite: “Parent › Child” or “Parent / Child”, one level deep. Missing suites are created. Leave it empty to use the "
     "import's default suite.", False),
    ("Priority: Critical, High, Medium or Low (empty = Medium).", False),
    ("Type: Functional, Security, Performance, Usability or Other (empty = Functional).", False),
    ("Status: Draft or Ready (empty = Draft).", False),
    ("Labels: separated by commas; letters, digits, dots, dashes or underscores (e.g. smoke, checkout-critical).", False),
    ("Steps: number each step (1., 2. …). Expected results: give each result the same number as its step; "
     "it can be left out, and one step can span several lines.", False),
    ("", False),
    ("Example row", True),
    ("Title: Pay with a saved card · Suite: Checkout › Payment · Priority: Critical · Type: Functional · Status: Ready · "
     "Labels: smoke, checkout-critical · Steps: “1. Choose the saved card and Pay” / “2. Wait for the confirmation page” · "
     "Expected results: “1. A spinner shows…” / “2. The order number shows…”", False),
    ("", False),
    ("Importing the same file twice creates the cases twice (IDs are never reused). A QA Lead can archive a whole "
     "import from the import page.", False),
])
wb.save(OUT / "test-cases-sample.xlsx")

# --- 2. File with problems ------------------------------------------------------
wb = Workbook()
ws = wb.active
ws.title = "Cases"
style_sheet(ws, PROBLEM_HEADERS, PROBLEM_WIDTHS)
for r, (cells, note) in enumerate(PROBLEMS, 2):
    for c, value in enumerate(cells, 1):
        body_cell(ws.cell(row=r, column=c, value=value))
    ws.cell(row=r, column=1).comment = Comment(note, "QA Portal")
# A blank row: skipped, but row numbers in messages still match the sheet.
how_to_sheet(wb, [
    ("A file with problems, to try the import checks", True),
    ("Import the “Cases” sheet. Its headers use other tools' names (Test name, Section, Category, State, Tags, Jira), "
     "so the Match columns step has to map them; ID and Owner are not imported.", False),
    ("Values to match: Urgent, P1, P2, Blocker, Smoke, Approved and “In review” aren't portal values; the import "
     "suggests what each becomes.", False),
    ("", False),
    ("What the Check rows step should report (the comment on each row's first cell says the same)", True),
    *[(f"Row {r}: {note}", False) for r, (_, note) in enumerate(PROBLEMS, 2)],
    ("", False),
    ("Nothing is imported while any row has an error. Fix rows 4–7 (or delete them) and upload the file again; "
     "your column and value choices are kept.", False),
])
for row in ws.iter_rows(min_row=2, max_row=len(PROBLEMS) + 1):
    if any(word in (row[0].comment.text if row[0].comment else "") for word in ("ERROR",)):
        for cell in row:
            cell.fill = NOTE_FILL
wb.save(OUT / "test-cases-with-problems.xlsx")

print(f"wrote {len(CASES)} sample cases and {len(PROBLEMS)} problem rows to {OUT}")
