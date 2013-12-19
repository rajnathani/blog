import re,sys


WANT_OPENING_BRACE = 10
WANT_CLOSING_BRACE = 12

def find_if_block(string_input, cur_index):
    remaining_input = string_input[cur_index:]
    if_true_indices = [(m.start(0), m.end(0)) for m in re.finditer(r'if\s*\(\s*true\s*\)\s*\{', remaining_input)]
    if if_true_indices:
        return if_true_indices[0][0] + cur_index


def find_brace(string_input, cur_index, wants):
    double_quote_started = False
    single_quote_started = False
    inline_comment_started = False
    opened_brace = 0
    closed_brace = 0
    remaining_input = string_input[cur_index:]
    count = 0
    #print remaining_input
    for char in remaining_input:
        if not inline_comment_started and char == '"' and not single_quote_started:
            double_quote_started = not double_quote_started

        if not inline_comment_started and char == "'" and not double_quote_started:
            single_quote_started = not single_quote_started
        if not inline_comment_started and char == '/' and remaining_input[count+1] == '/':
            inline_comment_started = True
        if (char == '\n') and inline_comment_started:
            inline_comment_started = False
        if not (double_quote_started or single_quote_started or inline_comment_started):
            if char == "{":
                opened_brace += 1
                if wants == WANT_OPENING_BRACE and opened_brace > closed_brace:
                    return cur_index + count
            if char == "}":
                closed_brace += 1
                if wants == WANT_CLOSING_BRACE and closed_brace > opened_brace:
                    return cur_index + count
        count += 1



def nerve_js(string_input):
    cur_index = 0
    answer = ""

    while True:
        if_index = find_if_block(string_input, cur_index)
        if if_index is None:
            break
        start_if_block = find_brace(string_input, if_index, WANT_OPENING_BRACE)
        end_if_block = find_brace(string_input, start_if_block+1, WANT_CLOSING_BRACE)

        start_else_block = find_brace(string_input, end_if_block+1, WANT_OPENING_BRACE)
        if start_else_block and 'else' in string_input[end_if_block:start_else_block]:
            end_else_block = find_brace(string_input, start_else_block+1, WANT_CLOSING_BRACE)
        else:
            start_else_block = end_if_block
            end_else_block = end_if_block

        answer += string_input[cur_index:if_index]
        answer += string_input[start_else_block+1:end_else_block]

        cur_index = end_else_block + 1

    answer += string_input[cur_index:]
    return answer

