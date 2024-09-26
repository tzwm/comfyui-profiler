import os
import time
import asyncio
from typing import Any

import execution

import server

_LOG_TIME = True
try: _LOG_TIME = os.getenv("COMFYUI_PROFILER_LOG_TIME", "true").lower() in ['true', '1']
except: pass

_PRECISION = 4
try: _PRECISION = int(os.getenv("COMFYUI_PROFILER_PRECISION", _PRECISION))
except: pass

exist_execute = execution.execute
exist_PromptExecutor_execute = execution.PromptExecutor.execute

profiler_data = {}
profiler_outputs = []

def send_message(data) -> None:
    s = server.PromptServer.instance
    s.send_sync('profiler', data)

def get_input_unique_ids(inputs) -> list:
    ret = []
    for key in inputs:
        input_data = inputs[key]
        if isinstance(input_data, list):
            ret.append(input_data[0])

    return ret


def get_total_inputs_time(current_item, dynprompt, calculated_inputs) -> tuple:
    input_unique_ids = get_input_unique_ids(dynprompt.get_node(current_item)['inputs'])
    total_time = profiler_data['nodes'].get(current_item, 0)
    calculated_nodes = calculated_inputs + [current_item]
    for id in input_unique_ids:
        if id in calculated_inputs:
            continue

        calculated_nodes += [id]
        t, calculated_inputs = get_total_inputs_time(id, dynprompt, calculated_nodes)
        total_time += t

    return total_time, calculated_nodes


#               server, dynprompt, caches, current_item, extra_data, executed, prompt_id, execution_list, pending_subgraph_results
def new_execute(server, dynprompt, caches, current_item, extra_data, executed, prompt_id, execution_list, pending_subgraph_results) -> Any:
    if not profiler_data.get('prompt_id') or profiler_data.get('prompt_id') != prompt_id:
        profiler_data['prompt_id'] = prompt_id
        profiler_data['nodes'] = {}
        profiler_outputs.clear()

    inputs = dynprompt.get_node(current_item)['inputs']
    input_unique_ids = get_input_unique_ids(inputs)
    executed_inputs = list(profiler_data['nodes'].keys())

    start_time = time.perf_counter()
    ret = exist_execute(server, dynprompt, caches, current_item, extra_data, executed, prompt_id, execution_list, pending_subgraph_results)
    end_time = time.perf_counter()

    profiler_data['nodes'][current_item] = 0
    this_time_nodes_time, _ = get_total_inputs_time(current_item, dynprompt, executed_inputs)
    profiler_data['nodes'][current_item] = end_time - start_time - this_time_nodes_time
    total_inputs_time, _ = get_total_inputs_time(current_item, dynprompt, [])

    send_message({
        'node': current_item,
        'current_time': profiler_data['nodes'][current_item],
        'total_inputs_time': total_inputs_time
    })

    inputs_str = ''
    if len(input_unique_ids) > 0:
        inputs_str = '('
        for id in input_unique_ids:
            inputs_str += f'#{id} '
        inputs_str = inputs_str[:-1] + ')'

    profiler_outputs.append(f"[profiler] #{current_item} {dynprompt.get_node(current_item)['class_type']}: \
{round(profiler_data['nodes'][current_item], _PRECISION)} seconds, total {round(total_inputs_time, _PRECISION)} seconds{inputs_str}")

    return ret


#                               self, prompt, prompt_id, extra_data={}, execute_outputs=[]
def new_prompt_executor_execute(self, prompt, prompt_id, extra_data={}, execute_outputs=[]) -> Any:
    ret = exist_PromptExecutor_execute(self, prompt, prompt_id, extra_data=extra_data, execute_outputs=execute_outputs)
    if _LOG_TIME:
        print('\n'.join(profiler_outputs))
    return ret

execution.execute = new_execute
execution.PromptExecutor.execute = new_prompt_executor_execute

WEB_DIRECTORY = "."
NODE_CLASS_MAPPINGS = {}
