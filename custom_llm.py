import os
import math
import random
import sys
import json

random.seed(42)

# --- Autograd ---
class Value:
    __slots__ = ('data', 'grad', '_children', '_local_grads')
    def __init__(self, data, children=(), local_grads=()):
        self.data = data
        self.grad = 0
        self._children = children
        self._local_grads = local_grads
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data + other.data, (self, other), (1, 1))
    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        return Value(self.data * other.data, (self, other), (other.data, self.data))
    def __pow__(self, other): return Value(self.data**other, (self,), (other * self.data**(other-1),))
    def log(self): return Value(math.log(self.data), (self,), (1/self.data,))
    def exp(self): return Value(math.exp(self.data), (self,), (math.exp(self.data),))
    def relu(self): return Value(max(0, self.data), (self,), (float(self.data > 0),))
    def __neg__(self): return self * -1
    def __radd__(self, other): return self + other
    def __sub__(self, other): return self + (-other)
    def __rsub__(self, other): return other + (-self)
    def __rmul__(self, other): return self * other
    def __truediv__(self, other): return self * other**-1
    def __rtruediv__(self, other): return other * self**-1
    def backward(self):
        topo = []
        visited = set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._children:
                    build_topo(child)
                topo.append(v)
        build_topo(self)
        self.grad = 1
        for v in reversed(topo):
            for child, local_grad in zip(v._children, v._local_grads):
                child.grad += local_grad * v.grad

# --- Hyperparameters ---
n_layer = 1
n_embd = 16
block_size = 16
n_head = 4
head_dim = n_embd // n_head

def init_model(vocab_size):
    matrix = lambda nout, nin, std=0.08: [[Value(random.gauss(0, std)) for _ in range(nin)] for _ in range(nout)]
    state_dict = {'wte': matrix(vocab_size, n_embd), 'wpe': matrix(block_size, n_embd), 'lm_head': matrix(vocab_size, n_embd)}
    for i in range(n_layer):
        state_dict[f'layer{i}.attn_wq'] = matrix(n_embd, n_embd)
        state_dict[f'layer{i}.attn_wk'] = matrix(n_embd, n_embd)
        state_dict[f'layer{i}.attn_wv'] = matrix(n_embd, n_embd)
        state_dict[f'layer{i}.attn_wo'] = matrix(n_embd, n_embd)
        state_dict[f'layer{i}.mlp_fc1'] = matrix(4 * n_embd, n_embd)
        state_dict[f'layer{i}.mlp_fc2'] = matrix(n_embd, 4 * n_embd)
    return state_dict

def get_params(state_dict):
    return [p for mat in state_dict.values() for row in mat for p in row]

def linear(x, w):
    return [sum(wi * xi for wi, xi in zip(wo, x)) for wo in w]

def softmax(logits):
    max_val = max(val.data for val in logits) if isinstance(logits[0], Value) else max(logits)
    if isinstance(logits[0], Value):
        exps = [(val - max_val).exp() for val in logits]
        total = sum(exps)
        return [e / total for e in exps]
    else:
        exps = [math.exp(val - max_val) for val in logits]
        total = sum(exps)
        return [e / total for e in exps]

def rmsnorm(x):
    ms = sum(xi * xi for xi in x) / len(x)
    scale = (ms + 1e-5) ** -0.5
    return [xi * scale for xi in x]

def gpt(token_id, pos_id, keys, values, state_dict):
    tok_emb = state_dict['wte'][token_id]
    pos_emb = state_dict['wpe'][pos_id]
    x = [t + p for t, p in zip(tok_emb, pos_emb)]
    x = rmsnorm(x)

    for li in range(n_layer):
        x_residual = x
        x = rmsnorm(x)
        q = linear(x, state_dict[f'layer{li}.attn_wq'])
        k = linear(x, state_dict[f'layer{li}.attn_wk'])
        v = linear(x, state_dict[f'layer{li}.attn_wv'])
        keys[li].append(k)
        values[li].append(v)
        x_attn = []
        for h in range(n_head):
            hs = h * head_dim
            q_h = q[hs:hs+head_dim]
            k_h = [ki[hs:hs+head_dim] for ki in keys[li]]
            v_h = [vi[hs:hs+head_dim] for vi in values[li]]
            attn_logits = [sum(q_h[j] * k_h[t][j] for j in range(head_dim)) / head_dim**0.5 for t in range(len(k_h))]
            attn_weights = softmax(attn_logits)
            head_out = [sum(attn_weights[t] * v_h[t][j] for t in range(len(v_h))) for j in range(head_dim)]
            x_attn.extend(head_out)
        x = linear(x_attn, state_dict[f'layer{li}.attn_wo'])
        x = [a + b for a, b in zip(x, x_residual)]
        
        x_residual = x
        x = rmsnorm(x)
        x = linear(x, state_dict[f'layer{li}.mlp_fc1'])
        x = [xi.relu() for xi in x]
        x = linear(x, state_dict[f'layer{li}.mlp_fc2'])
        x = [a + b for a, b in zip(x, x_residual)]

    logits = linear(x, state_dict['lm_head'])
    return logits

def save_model(state_dict, uchars, model_dir):
    os.makedirs(model_dir, exist_ok=True)
    with open(f"{model_dir}/vocab.json", 'w') as f:
        json.dump(uchars, f)
    
    raw_dict = {}
    for k, mat in state_dict.items():
        raw_dict[k] = [[val.data for val in row] for row in mat]
    
    with open(f"{model_dir}/model.json", 'w') as f:
        json.dump(raw_dict, f)

def load_model(model_dir):
    with open(f"{model_dir}/vocab.json", 'r') as f:
        uchars = json.load(f)
    
    with open(f"{model_dir}/model.json", 'r') as f:
        raw_dict = json.load(f)
        
    state_dict = {}
    for k, mat in raw_dict.items():
        state_dict[k] = [[Value(val) for val in row] for row in mat]
        
    return state_dict, uchars

if __name__ == "__main__":
    mode = sys.argv[1]
    model_id = sys.argv[2]
    model_dir = f"./models/{model_id}"

    if mode == "train":
        dataset_path = sys.argv[3]
        num_steps = int(sys.argv[4])
        
        with open(dataset_path, 'r', encoding='utf-8') as f:
            docs = [line.strip() for line in f if line.strip()]
        if len(docs) == 0:
            docs = ['dummy']
        
        uchars = sorted(set(''.join(docs)))
        BOS = len(uchars)
        vocab_size = len(uchars) + 1
        
        state_dict = init_model(vocab_size)
        params = get_params(state_dict)
        
        learning_rate, beta1, beta2, eps_adam = 0.01, 0.85, 0.99, 1e-8
        m = [0.0] * len(params)
        v = [0.0] * len(params)
        
        for step in range(num_steps):
            doc = docs[step % len(docs)]
            tokens = [BOS] + [uchars.index(ch) for ch in doc] + [BOS]
            n = min(block_size, len(tokens) - 1)
            
            keys, values = [[] for _ in range(n_layer)], [[] for _ in range(n_layer)]
            losses = []
            for pos_id in range(n):
                token_id, target_id = tokens[pos_id], tokens[pos_id + 1]
                logits = gpt(token_id, pos_id, keys, values, state_dict)
                probs = softmax(logits)
                loss_t = -probs[target_id].log()
                losses.append(loss_t)
            
            if len(losses) > 0:
                loss = (1 / n) * sum(losses)
                loss.backward()
                
                lr_t = learning_rate * (1 - step / num_steps)
                for i, p in enumerate(params):
                    m[i] = beta1 * m[i] + (1 - beta1) * p.grad
                    v[i] = beta2 * v[i] + (1 - beta2) * p.grad ** 2
                    m_hat = m[i] / (1 - beta1 ** (step + 1))
                    v_hat = v[i] / (1 - beta2 ** (step + 1))
                    p.data -= lr_t * m_hat / (v_hat ** 0.5 + eps_adam)
                    p.grad = 0
            else:
                loss = Value(0.0)
            
            if (step + 1) % 10 == 0 or step == num_steps - 1:
                print(json.dumps({"step": step + 1, "loss": loss.data}), flush=True)

        save_model(state_dict, uchars, model_dir)
        print(json.dumps({"status": "done"}), flush=True)

    elif mode == "infer":
        temperature = float(sys.argv[3])
        num_samples = int(sys.argv[4])
        
        state_dict, uchars = load_model(model_dir)
        BOS = len(uchars)
        vocab_size = len(uchars) + 1
        
        samples = []
        for sample_idx in range(num_samples):
            keys, values = [[] for _ in range(n_layer)], [[] for _ in range(n_layer)]
            token_id = BOS
            sample = []
            for pos_id in range(block_size):
                logits = gpt(token_id, pos_id, keys, values, state_dict)
                
                logits_data = [l.data for l in logits]
                probs_data = softmax([l / temperature for l in logits_data])
                
                token_id = random.choices(range(vocab_size), weights=probs_data)[0]
                if token_id == BOS:
                    break
                sample.append(uchars[token_id])
            samples.append(''.join(sample))
            
        print(json.dumps({"samples": samples}))
