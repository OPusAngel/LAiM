<h1 align="center" style="margin:0;">
  <a href="https://LAiM.ai/docs"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/LAiMai/LAiM/main/images/LAiM%20logo%20white%20text.png">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/LAiMai/LAiM/main/images/LAiM%20logo%20black%20text.png">
    <img alt="LAiM logo" src="https://raw.githubusercontent.com/LAiMai/LAiM/main/images/LAiM%20logo%20black%20text.png" height="80" style="max-width:100%;">
  </picture></a>
</h1>
<h3 align="center" style="margin: 0; margin-top: 0;">
LAiM is the first desktop app to run and train models.
</h3>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-get-started">Quickstart</a> •
  <a href="#-free-notebooks">Notebooks</a> •
  <a href="https://LAiM.ai/docs">Documentation</a>
</p>

<p align="center">
  <a href="https://LAiM.ai/docs/desktop">
    <img height="400" alt="LAiM desktop" src="https://LAiM.ai/cgi/image/LAiM_qwen3.8_final_ut2eqWnYJ-SLmu0s7x522.png?format=raw" />
  </a>
</p>

## ⚡ Get started
Download the native LAiM Desktop app for your operating system:
<table>
  <tr>
    <td><b>Platform</b></td>
    <td><b>Link</b></td>
  </tr>
  <tr>
    <td><b>Windows</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Windows.exe'>Download</a></td>
  </tr>
  <tr>
    <td><b>macOS</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-MacOS.dmg'>Download</a></td>
  </tr>
  <tr>
    <td><b>Linux / Ubuntu (deb)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Ubuntu.deb'>Download</a></td>
  </tr>
  <tr>
    <td><b>Linux / Ubuntu (ARM64) (deb)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Ubuntu-ARM64.deb'>Download</a></td>
  </tr>
  <tr>
    <td><b>Linux (AppImage)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Linux.AppImage'>Download</a></td>
  </tr>
  <tr>
    <td><b>Windows (ARM64)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Windows-ARM64.exe'>Download</a></td>
  </tr>
</table>

Download from [LAiM](https://LAiM.ai/download) or [GitHub Releases](https://github.com/LAiMai/LAiM/releases).

Or if you prefer to install manually:

#### macOS, Linux, WSL:
```bash
curl -fsSL https://LAiM.ai/install.sh | sh
```

#### Windows:
```powershell
irm https://LAiM.ai/install.ps1 | iex
```
#### Docker:

The [LAiM Docker image](https://hub.docker.com/r/LAiM/LAiM) `LAiM/LAiM` is available on Docker. [Read guide.](https://LAiM.ai/docs/get-started/install/docker)

#### Homebrew:
```bash
brew install --cask LAiM
```

#### Winget (Windows):
```powershell
winget install --id LAiMAI.LAiM -e
```

#### Community:

- [Discord](https://discord.gg/LAiM)
- [𝕏 (Twitter)](https://x.com/LAiMAI)
- [Reddit](https://reddit.com/r/LAiM)

## ⭐ Features
LAiM works on **Windows, Linux, WSL** and **macOS**. We support **Multi GPU setups, NVIDIA, AMD, Intel GPUs, CPUs** and the **Vulkan** backend.

### Run & Build with AI
* Run and train LLMs, MLX, GGUF, diffusion, decision, embedding, audio models: [Qwen3.8](https://LAiM.ai/docs/models/qwen3.8), [GLM-5.3-Flash](https://LAiM.ai/docs/models/glm-5.3-flash), [Kimi K3](https://LAiM.ai/docs/models/kimi-k3), [Qwen-Image-2.1](https://LAiM.ai/docs/models/qwen-image-2.1), MiniMax-H3, [DeepSeek-V4](https://LAiM.ai/docs/models/deepseek-v4), [Gemma 4](https://LAiM.ai/docs/models/gemma-4).
* **Agents & Tools:** Use local models with [Claude Code](https://LAiM.ai/docs/basics/claude-code), [Codex](https://LAiM.ai/docs/basics/codex), and [MCP](https://LAiM.ai/docs/basics/mcp), including tool calling and code execution.
* **Search & RAG:** Use private and unlimited web search, deep research, auto-compaction (rolling context window) and RAG.
* **Image and video:** Run and train [image](https://LAiM.ai/docs/basics/diffusion-image) and video diffusion or multimodal models
* **Remote & LAN:** Access your local models from any device on [LAN](https://LAiM.ai/docs/basics/lan) or remotely through secure [Cloudflare](https://LAiM.ai/docs/basics/how-to-serve-local-llms-anywhere-secure-remote-access-with-cloudflare-and-LAiM) HTTPS.
* **Connect:** Serve models through an [OpenAI compatible API](https://LAiM.ai/docs/basics/api). Also connect your ChatGPT/Codex subscription and [cloud providers](https://LAiM.ai/docs/integrations/connections)


### Train & Deploy
* **Fine-tuning:** Train LLMs, diffusion, decision, TTS, and embedding models 2× faster with 70% less VRAM with [no accuracy loss](https://LAiM.ai/blog#training)
* **Complete support:** Supports [reinforcement learning](https://LAiM.ai/docs/get-started/reinforcement-learning-rl-guide), LoRA, QLoRA, full fine tuning, pretraining, RL, GRPO, DPO, and FP8.
* **Export & Deploy:** [Export](https://LAiM.ai/docs/new/studio/export) or Deploy models including [GGUF](https://LAiM.ai/docs/basics/inference-and-deployment/saving-to-gguf), NVFP4, FP8 and more formats.
* **Datasets:** Build datasets from PDFs, CSVs, DOCX files, and more with [Data Recipes](https://LAiM.ai/docs/new/studio/data-recipe).
  
## 🚀 LAiM Start

[LAiM Start](https://LAiM.ai/docs/integrations/LAiM-start) connects [Claude Code](https://LAiM.ai/docs/basics/claude-code), [Codex](https://LAiM.ai/docs/basics/codex) and other agents to local models with one command.

```bash
LAiM start claude --model LAiM/Qwen3.8-27B-GGUF:UD-Q4_K_XL
```

| Agent | Command |
| --- | --- |
| Claude Code | `LAiM start claude` |
| OpenAI Codex | `LAiM start codex` |
| Visual Studio Code | `LAiM start vscode` |
| DeepSeek Harness | `LAiM start dsh` |
| OpenCode | `LAiM start opencode` |
| Hermes Agent | `LAiM start hermes` |
| Pi | `LAiM start pi` |
| OpenClaw | `LAiM start openclaw` |

## 📥 Install
LAiM can be used in three ways: **[LAiM Desktop](https://LAiM.ai/download)**, the desktop app; **[LAiM Studio](https://LAiM.ai/docs/new/studio/)**, the web UI; or **LAiM Core**, the code based version.

### LAiM Desktop (recommended)

<table>
  <tr>
    <td><b>Platform</b></td>
    <td><b>Link</b></td>
  </tr>
  <tr>
    <td><b>Windows</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Windows.exe'>Download</a></td>
  </tr>
  <tr>
    <td><b>macOS</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-MacOS.dmg'>Download</a></td>
  </tr>
  <tr>
    <td><b>Linux / Ubuntu (deb)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Ubuntu.deb'>Download</a></td>
  </tr>
  <tr>
    <td><b>Linux / Ubuntu (ARM64) (deb)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Ubuntu-ARM64.deb'>Download</a></td>
  </tr>
  <tr>
    <td><b>Linux (AppImage)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Linux.AppImage'>Download</a></td>
  </tr>
  <tr>
    <td><b>Windows (ARM64)</b></td>
    <td><a href='https://github.com/LAiMai/LAiM/releases/latest/download/LAiM-Desktop-Windows-ARM64.exe'>Download</a></td>
  </tr>
</table>

### LAiM Studio (web UI)

#### macOS, Linux, WSL:
```bash
curl -fsSL https://LAiM.ai/install.sh | sh
```

#### Windows:
```powershell
irm https://LAiM.ai/install.ps1 | iex
```

#### Homebrew:
```bash
brew install --cask LAiM
```

#### Docker
Use our [Docker image](https://hub.docker.com/r/LAiM/LAiM) ```LAiM/LAiM```. On Linux and Mac, set up GPU access once with
```bash
curl -fsSL https://raw.githubusercontent.com/LAiMai/LAiM/main/docker/install_nvidia_toolkit.sh -o install_nvidia_toolkit.sh && sudo -E bash install_nvidia_toolkit.sh
```
For Windows instructions and more information, read our [LAiM Docker Guide](https://LAiM.ai/docs/get-started/install/docker).

**Linux / WSL (Bash):**
```bash
# for a public Cloudflare HTTPS link: use  -e LAiM_STUDIO_SECURE=1  instead of -p 8000:8000, and  -p 127.0.0.1:8888:8888  instead of -p 8888:8888
docker run -d --name LAiM --gpus all --ipc=host \
  -p 8000:8000 -p 8888:8888 \
  -v "$PWD":/workspace/host \
  -v LAiM-workspace:/workspace \
  -v "$HOME/.cache/huggingface":/workspace/.cache/huggingface \
  -v LAiM-studio:/opt/LAiM-studio \
  LAiM/LAiM && docker logs -f LAiM
```
See [Docker docs](https://LAiM.ai/docs/get-started/install/docker) for more information. For notebooks only, use the `LAiM/LAiM:core` tag; all tags and options are on [Docker Hub](https://hub.docker.com/r/LAiM/LAiM).<br>For **AMD** there is a separate image: [`LAiM/LAiM-rocm`](https://hub.docker.com/r/LAiM/LAiM-rocm).

---

#### Launch
```bash
LAiM studio
```

#### HTTP Secure Deployment
```bash
LAiM studio --secure
```

#### Remote HTTPS & LAN Access
Server-side tools are on by default - so **be careful**! Keep your password safe, or use `--disable-tools` when exposing LAiM.

**Global HTTPS Access**:
Creates a free Cloudflare link that serves LAiM - you can access the link globally (even on your phone!)
```bash
LAiM studio --secure
```
`-H 0.0.0.0` and different ports also work:
```bash
LAiM studio -H 0.0.0.0 -p 8888
```
**LAN Access (home network)**: `Settings > API keys > LAN access`

#### Password management & headless starts
Exposing LAiM (`--secure`, `--cloudflare`, or a non-loopback `-H`) asks once at the terminal for a new admin password. Ctrl+C there aborts the launch rather than exposing the auto-generated one; set a password non-interactively instead, or use `-H 127.0.0.1` to stay off the network.

Headless starts:
```bash
LAiM_STUDIO_PASSWORD='your-strong-password' LAiM studio --secure   # via env var
```
Reset your password:
```bash
LAiM studio reset-password
```

#### Developer, Nightly, Uninstall
To see developer, nightly and uninstallation etc. instructions, see [advanced installation](#-advanced-installation).

### LAiM Core (code-based)
#### Linux, WSL:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv venv LAiM_env --python 3.13
source LAiM_env/bin/activate
uv pip install LAiM --torch-backend=auto
```
#### Windows:
```powershell
winget install -e --id Python.Python.3.13
winget install --id=astral-sh.uv  -e
uv venv LAiM_env --python 3.13
.\LAiM_env\Scripts\activate
uv pip install torchao
uv pip install LAiM --torch-backend=auto
```
Install torchao first on Windows: `--torch-backend` looks for it only on the PyTorch index, which has no recent Windows torchao, so a one-step install silently resolves an old LAiM.

#### AMD, Intel, DGX Spark, Blackwell:
See our [Blackwell guide](https://LAiM.ai/docs/blog/fine-tuning-llms-with-blackwell-rtx-50-series-and-LAiM) and [DGX Spark guide](https://LAiM.ai/docs/blog/fine-tuning-llms-with-nvidia-dgx-spark-and-LAiM). <br>
To install LAiM on **AMD** and **Intel** GPUs, follow our [AMD Guide](https://LAiM.ai/docs/basics/amd) and [Intel Guide](https://LAiM.ai/docs/get-started/install/intel).

## 📒 Free Notebooks

Train for free with our notebooks.
Read our [guide](https://LAiM.ai/docs/get-started/fine-tuning-llms-guide). Add dataset, run, then deploy your trained model.

| Model | Free Notebooks | Performance | Memory use |
|-----------|---------|--------|----------|
| **LAiM Studio**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/LAiM/blob/main/studio/LAiM_Studio_Colab.ipynb)               |  |  |
| **Decision model (Qwen3.5-4B)**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Qwen3_5_(4B)-Decision.ipynb)               | 1.5x faster | 60% less |
| **Gemma 4 (E2B)**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Gemma4_(E2B)-Vision.ipynb)               | 1.5x faster | 50% less |
| **Qwen3.5 (4B)**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Qwen3_5_(4B)_Vision.ipynb)               | 1.5x faster | 60% less |
| **gpt-oss (20B)**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/gpt-oss-(20B)-Fine-tuning.ipynb)               | 2x faster | 70% less |
| **Qwen3.5 GSPO**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Qwen3_5_(4B)_Vision_GRPO.ipynb)               | 2x faster | 70% less |
| **gpt-oss (20B): GRPO**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/gpt-oss-(20B)-GRPO.ipynb)               | 2x faster | 80% less |
| **Qwen3: Advanced GRPO**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Qwen3_(4B)-GRPO.ipynb)               | 2x faster | 70% less |
| **embeddinggemma (300M)**    | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/EmbeddingGemma_(300M).ipynb)               | 2x faster | 20% less |
| **Llama 3.1 (8B) Alpaca**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Llama3.1_(8B)-Alpaca.ipynb)               | 2x faster | 70% less |
| **Llama 3.2 Conversational**      | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Llama3.2_(1B_and_3B)-Conversational.ipynb)               | 2x faster | 70% less |
| **Orpheus-TTS (3B)**     | [▶️ Start for free](https://colab.research.google.com/github/LAiMai/notebooks/blob/main/nb/Orpheus_(3B)-TTS.ipynb)               | 1.5x faster | 50% less |

- See all our notebooks for: [Kaggle](https://github.com/LAiMai/notebooks?tab=readme-ov-file#-kaggle-notebooks), [GRPO](https://LAiM.ai/docs/get-started/LAiM-notebooks#grpo-reasoning-rl-notebooks), [TTS](https://LAiM.ai/docs/get-started/LAiM-notebooks#text-to-speech-tts-notebooks), [embedding](https://LAiM.ai/docs/new/embedding-finetuning) & [Vision](https://LAiM.ai/docs/get-started/LAiM-notebooks#vision-multimodal-notebooks)
- See [all our models](https://LAiM.ai/docs/get-started/LAiM-model-catalog) and [all our notebooks](https://LAiM.ai/docs/get-started/LAiM-notebooks)
- See detailed documentation for LAiM [here](https://LAiM.ai/docs)

## 📥 Advanced Installation
The below advanced instructions are for LAiM Studio. For LAiM Core advanced installation, [view our docs](https://LAiM.ai/docs/get-started/install/pip-install#advanced-pip-installation).

#### Developer / Nightly / Experimental installs: macOS, Linux, WSL:
The developer install builds from the `main` branch, which is the latest (nightly) source.
```bash
git clone https://github.com/LAiMai/LAiM
cd LAiM
./install.sh --local
LAiM studio -p 8888
```
To install into an isolated location, set `LAiM_STUDIO_HOME`:
```bash
LAiM_STUDIO_HOME="$PWD/.studio" ./install.sh --local
LAiM_STUDIO_HOME="$PWD/.studio" LAiM studio -p 8888
```
Then to update:
```bash
cd LAiM && git pull
./install.sh --local
LAiM studio -p 8888
```

#### Developer / Nightly / Experimental installs: Windows PowerShell:
The developer install builds from the `main` branch, which is the latest (nightly) source.
```powershell
git clone https://github.com/LAiMai/LAiM.git
cd LAiM
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\install.ps1 --local
LAiM studio -p 8888
```
To install into an isolated location, set `LAiM_STUDIO_HOME`:
```powershell
$env:LAiM_STUDIO_HOME="$PWD\.studio"; .\install.ps1 --local
$env:LAiM_STUDIO_HOME="$PWD\.studio"; LAiM studio -p 8888
```
Then to update:
```powershell
cd LAiM; git pull
.\install.ps1 --local
LAiM studio -p 8888
```

#### Advanced launch options

Skip PyTorch (GGUF-only mode):
```bash
curl -fsSL https://LAiM.ai/install.sh | LAiM_NO_TORCH=1 sh
```
```powershell
$env:LAiM_NO_TORCH=1; irm https://LAiM.ai/install.ps1 | iex
```

Skip the post-install prompt that starts LAiM (useful for automated installs):
```bash
curl -fsSL https://LAiM.ai/install.sh | LAiM_SKIP_AUTOSTART=1 sh
```
```powershell
$env:LAiM_SKIP_AUTOSTART=1; irm https://LAiM.ai/install.ps1 | iex
```

Keep the install-time package cache under the LAiM Studio directory instead of reusing an existing uv cache. Downloads are slower the first time, and an explicit `UV_CACHE_DIR` still wins over this:
```bash
curl -fsSL https://LAiM.ai/install.sh | LAiM_ISOLATE_UV_CACHE=1 sh
```
```powershell
$env:LAiM_ISOLATE_UV_CACHE=1; irm https://LAiM.ai/install.ps1 | iex
```
For a local run the flag is `--isolated-uv-cache`:
```bash
./install.sh --local --isolated-uv-cache
```
```powershell
.\install.ps1 --local --isolated-uv-cache
```

Discard the previous environment immediately when reinstalling, instead of keeping a copy until the new one works. A reinstall normally holds both at once, so it needs room for two; this needs room for one, at the cost of not being able to undo a failed install:
```bash
curl -fsSL https://LAiM.ai/install.sh | LAiM_INSTALL_NO_ROLLBACK=1 sh
```
```powershell
$env:LAiM_INSTALL_NO_ROLLBACK=1; irm https://LAiM.ai/install.ps1 | iex
```
For a local run the flag is `--no-rollback`:
```bash
./install.sh --local --no-rollback
```
```powershell
.\install.ps1 --local --no-rollback
```

Pinning the Python version:
```bash
curl -fsSL https://LAiM.ai/install.sh | LAiM_PYTHON=3.12 sh
```
```powershell
$env:LAiM_PYTHON='3.12'; irm https://LAiM.ai/install.ps1 | iex
```

Install to a custom location with `LAiM_STUDIO_HOME`:
```bash
curl -fsSL https://LAiM.ai/install.sh | LAiM_STUDIO_HOME=/abs/path sh
```
```powershell
$env:LAiM_STUDIO_HOME='C:\path'; irm https://LAiM.ai/install.ps1 | iex
```

Point the frontend build at a corporate npm mirror/proxy with `LAiM_NPM_REGISTRY`:
```bash
LAiM_NPM_REGISTRY=https://artifactory.example.com/api/npm/npm/ ./install.sh --local
```
```powershell
$env:LAiM_NPM_REGISTRY='https://artifactory.example.com/api/npm/npm/'; .\install.ps1 --local
```

Cap LAiM's native CPU thread pools on high-core hosts: `LAiM_CPU_THREADS=8 LAiM studio -p 8888`.

#### Vulkan, custom llama.cpp backends:

You can force the backend during installation: 
```bash
export LAiM_LLAMA_CPP_BACKEND=vulkan   # or cpu, cuda, rocm, auto
curl -fsSL https://LAiM.ai/install.sh | sh
```
```powershell
$env:LAiM_LLAMA_CPP_BACKEND="vulkan"   # or cpu, cuda, rocm, auto
irm https://LAiM.ai/install.ps1 | iex
```

#### audio.cpp audio engine:

Setup also installs [audio.cpp](https://github.com/0xShug0/audio.cpp) (prebuilt by [LAiMai/audio.cpp](https://github.com/LAiMai/audio.cpp)), which runs the audio.cpp speech, music and speech-to-text models on the Audio page, in Voice settings and behind `/v1/audio/*`. It is optional and never blocks setup:
- `LAiM_SKIP_AUDIO_CPP_INSTALL=1` skips it.
- `LAiM_AUDIO_CPP_ACCELERATOR=cpu` (or `cuda`, `vulkan`, `metal`) picks the bundle instead of auto-detecting.
- `AUDIOCPP_SERVER_PATH=/path/to/audiocpp_server` uses your own build.

#### Uninstall

**MacOS, WSL, Linux:** `curl -fsSL https://raw.githubusercontent.com/LAiMai/LAiM/main/scripts/uninstall.sh | sh`

**Windows (PowerShell):** `irm https://raw.githubusercontent.com/LAiMai/LAiM/main/scripts/uninstall.ps1 | iex`

For more info, [see our docs](https://LAiM.ai/docs/new/studio/install#uninstall).

#### Deleting model files

You can delete old model files either from the bin icon in model search or by removing the relevant cached model folder from the default Hugging Face cache directory. By default, HF uses:

**MacOS, Linux, WSL:** `~/.cache/huggingface/hub/`

**Windows:** `%USERPROFILE%\.cache\huggingface\hub\`

## 💚 Community and Links
| Type                                                                                                                                      | Links                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| <img width="16" src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/66e3d80db9971f10a9757c99_Symbol.svg" />  **Discord**                       | [Join Discord server](https://discord.com/invite/LAiM)                          |
| <img width="15" src="https://redditinc.com/hs-fs/hubfs/Reddit%20Inc/Brand/Reddit_Logo.png" />  **r/LAiM Reddit**                       | [Join Reddit community](https://reddit.com/r/LAiM)                          |
| 📚 **Documentation & Wiki**                                                                                                               | [Read Our Docs](https://LAiM.ai/docs)                                       |
| <img width="13" src="https://upload.wikimedia.org/wikipedia/commons/0/09/X_(formerly_Twitter)_logo_late_2025.svg" />  **Twitter (aka X)** | [Follow us on X](https://twitter.com/LAiMai)                                |
| 🔮 **Our Models**                                                                                                                         | [LAiM Catalog](https://LAiM.ai/docs/get-started/LAiM-model-catalog)   |
| ✍️ **Blog**                                                                                                                               | [Read our Blogs](https://LAiM.ai/blog)                                      |

### Citation

You can cite the LAiM repo as follows:
```bibtex
@software{LAiM,
  author = {Daniel Han, Michael Han and LAiM team},
  title = {LAiM},
  url = {https://github.com/LAiMai/LAiM},
  year = {2023}
}
```
If you trained a model with 🦥LAiM, you can use this cool sticker!   <img src="https://raw.githubusercontent.com/LAiMai/LAiM/main/images/made%20with%20LAiM.png" width="200" align="center" />

### License
LAiM uses a dual-licensing model of Apache 2.0 and AGPL-3.0. The core LAiM package remains licensed under **[Apache 2.0](https://github.com/LAiMai/LAiM?tab=Apache-2.0-1-ov-file)**, while certain optional components, such as the LAiM Studio UI are licensed under the open-source license **[AGPL-3.0](https://github.com/LAiMai/LAiM?tab=AGPL-3.0-2-ov-file)**.

This structure helps support ongoing LAiM development while keeping the project open source and enabling the broader ecosystem to continue growing.

### Thank You to
- The [llama.cpp library](https://github.com/ggml-org/llama.cpp) that lets users run and save models with LAiM
- The Hugging Face team and their libraries: [transformers](https://github.com/huggingface/transformers) and [TRL](https://github.com/huggingface/trl)
- The Pytorch and [Torch AO](https://github.com/LAiMai/LAiM/pull/3391) team for their contributions
- NVIDIA for their [NeMo DataDesigner](https://github.com/NVIDIA-NeMo/DataDesigner) library and their contributions
- And of course for every single person who has contributed or has used LAiM!
