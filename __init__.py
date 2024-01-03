import time
import execution

exist_recursive_execute = execution.recursive_execute

profiler_data = {}

def get_input_unique_ids(inputs):
    ret = []
    for key in inputs:
        input_data = inputs[key]
        if isinstance(input_data, list):
            ret.append(input_data[0])

    return ret


def get_total_inputs_time(current_item, prompt, calculated_inputs):
    input_unique_ids = get_input_unique_ids(prompt[current_item]['inputs'])
    total_time = profiler_data['nodes'][current_item]
    calculated_nodes = calculated_inputs + [current_item]
    for id in input_unique_ids:
        if id in calculated_inputs:
            continue

        calculated_nodes += [id]
        t, calculated_inputs = get_total_inputs_time(id, prompt, calculated_nodes)
        total_time += t

    return total_time, calculated_nodes


def new_recursive_execute(server, prompt, outputs, current_item, extra_data, executed, prompt_id, outputs_ui, object_storage):
    if not profiler_data.get('prompt_id') or profiler_data.get('prompt_id') != prompt_id:
        profiler_data['prompt_id'] = prompt_id
        profiler_data['nodes'] = {}

    inputs = prompt[current_item]['inputs']
    input_unique_ids = get_input_unique_ids(inputs)
    executed_inputs = list(profiler_data['nodes'].keys())

    start_time = time.time()
    ret = exist_recursive_execute(server, prompt, outputs, current_item, extra_data, executed, prompt_id, outputs_ui, object_storage)
    end_time = time.time()

    profiler_data['nodes'][current_item] = 0
    this_time_nodes_time, _ = get_total_inputs_time(current_item, prompt, executed_inputs)
    profiler_data['nodes'][current_item] = end_time - start_time - this_time_nodes_time
    total_inputs_time, _ = get_total_inputs_time(current_item, prompt, [])

    inputs_str = ''
    if len(input_unique_ids) > 0:
        inputs_str = '('
        for id in input_unique_ids:
            inputs_str += f'#{id} '
        inputs_str = inputs_str[:-1] + ')'

    print(f"[profiler] #{current_item} {prompt[current_item]['class_type']}: \
{round(profiler_data['nodes'][current_item], 4)} seconds, total {round(total_inputs_time, 4)} seconds{inputs_str}")

    return ret


execution.recursive_execute = new_recursive_execute

WEB_DIRECTORY = ""
NODE_CLASS_MAPPINGS = {}
