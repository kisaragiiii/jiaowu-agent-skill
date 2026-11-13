# 教务Agent Skill

## 直接用 GitHub 链接安装（推荐）

无需手动下载 ZIP。将下面整段话发给支持 Skill 和 Node/命令执行的智能体：

> 请从 https://github.com/kisaragiiii/jiaowu-agent-skill 安装并启用教务Agent，Skill 位于 jiaowu-agent 目录。先阅读 README.md 和该目录的 SKILL.md，将完整目录安装到当前平台的 Skill 目录，按 Skill 自动检查并安装钉钉 CLI，已有环境直接复用，最后引导我完成本人钉钉授权。不具备工具执行能力时请说明限制。

[查看可直接安装的 Skill 目录](https://github.com/kisaragiiii/jiaowu-agent-skill/tree/main/jiaowu-agent)

支持从 GitHub 安装 Skill 的客户端可直接选择上述目录；其他支持命令执行的智能体可拉取仓库并复制完整目录。不能只复制 SKILL.md，scripts 也必须保留。不要覆盖已有个人连接文件。更新前备份原目录，再重新读取 Skill；必要时重启智能体会话。

## 首次连接与使用

1. 智能体自动检查、准备 CLI 和 AI 表格 Skill；本人完成钉钉登录授权，不向任何人提供密码。
2. 导入负责人私下发放的个人连接文件。通用仓库不包含个人授权，安装成功不等于已获业务权限。不要把连接内容粘贴到公开仓库或聊天中。
3. 核对本人 Agent 状态并按需完成字段配置，然后直接粘贴转案，或提出学员、企业查询。

使用教务当前智能体自带的模型，无需负责人另购模型 API。后台负责业务权限、配置和回执。当前本地模型使用的独立 SOP 检索接口尚未接入，不能把安装成功当成知识库问答已完成；可选服务端问答仅在负责人另行启用后可用。

平台必须支持 Skill 与 Node 工具执行；普通聊天窗口仅打开链接不能安装。千问办公使用其专用连接器，接入方式需单独验收。业务服务依赖负责人 Mac 开机联网；sandbox 是沙箱演练。正式读写、各平台接入与定时投递仍需分别验收。

## ZIP 备用下载

[下载通用 Skill 安装包](https://github.com/kisaragiiii/jiaowu-agent-skill/raw/refs/heads/main/jiaowu-agent-skill.zip)，解压后将完整 jiaowu-agent 目录交给智能体，说“安装并启用教务Agent”。SHA256SUMS 用于核验安装包。

此仓库仅发布通用客户端源码和安装包。负责人后台、完整人设、业务规则、真实表信息、SOP 和个人凭据均不公开。不要将个人包或 connection.json 上传到 GitHub。
