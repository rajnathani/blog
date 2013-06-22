import re


def find_if_block(string_input, cur_index):
    remaining_input = string_input[cur_index:]
    if_true_indices = [(m.start(0), m.end(0)) for m in re.finditer(r'if\s*\(\s*true\s*\)\s*\{', remaining_input)]
    if if_true_indices:
        return if_true_indices[0][0] + cur_index


def find_else_block(string_input, cur_index):
    remaining_input = string_input[cur_index:]
    if_true_indices = [(m.start(0), m.end(0)) for m in re.finditer(r'else\s*\{', remaining_input)]
    if if_true_indices:
        return if_true_indices[0][1] + cur_index


def extract_end_else_block(string_input, cur_index):
    double_quote_started = False
    single_quote_started = False
    opened_brace = 0
    closed_brace = 0
    remaining_input = string_input[cur_index:]
    count = 0
    #print remaining_input
    for char in remaining_input:
        if char == '"' and not single_quote_started:
            double_quote_started = not double_quote_started
        if char == "'" and not double_quote_started:
            single_quote_started = not single_quote_started
        if not (double_quote_started or single_quote_started):
            if char == "{":
                opened_brace += 1
            if char == "}":
                if opened_brace != closed_brace:
                    closed_brace += 1
                else:
                    return cur_index + count
        count += 1



def nerve_js(string_input):
    cur_index = 0
    answer = ""

    while True:
        start_if_index = find_if_block(string_input, cur_index)
        if start_if_index is None:
            break
        start_else_block = find_else_block(string_input, start_if_index)
        end_else_block = extract_end_else_block(string_input, start_else_block)
        answer += string_input[cur_index:start_if_index]
        answer += string_input[start_else_block:end_else_block]
        cur_index = end_else_block + 1

    answer += string_input[cur_index:]
    return answer

