# 教务Agent Skill

## 直接用 GitHub 链接安装（推荐）

无需手动下载 ZIP。将下面整段话发给支持 Skill 和 Node/命令执行的智能体：

> 请从 https://github.com/kisaragiiii/jiaowu-agent-skill 安装并启用教务Agent，Skill 位于 jiaowu-agent 目录。先阅读 README.md 和该目录的 SKILL.md，将完整目录安装到当前平台的 Skill 目录，按 Skill 自动检查并安装钉钉 CLI，已有环境直接复用，最后引导我完成本人钉钉授权。不具备工具执行能力时请说明限制。

[查看可直接安装的 Skill 目录](https://github.com/kisaragiiii/jiaowu-agent-skill/tree/main/jiaowu-agent)

支持从 GitHub 安装 Skill 的客户端可直接选择上述目录；其他支持命令执行的智能体可拉取仓库并复制完整目录。不能只复制 SKILL.md，scripts 也必须保留。不要覆盖已有个人连接文件。更新前备份原目录，再重新读取 Skill；必要时重启智能体会话。

## 首次连接与使用

1. 智能体自动检查、准备 CLI 和 AI 表格 Skill；本人完成钉钉登录授权，不向任何人提供密码。
2. 使用负责人提供的服务地址发起设备申请，将申请编号发给负责人；批准后完成连接。通用仓库不包含个人授权，安装成功不等于已获业务权限。不要把连接内容粘贴到公开仓库或聊天中。
3. 核对本人 Agent 状态并按需完成字段配置，然后直接粘贴转案，或提出学员、企业查询。

使用教务当前智能体自带的模型，无需负责人另购模型 API。后台负责业务权限、配置和回执。当前本地模型使用的独立 SOP 检索接口尚未接入，不能把安装成功当成知识库问答已完成；可选服务端问答仅在负责人另行启用后可用。

平台必须支持 Skill 与 Node 工具执行；普通聊天窗口仅打开链接不能安装。千问办公使用其专用连接器，接入方式需单独验收。业务服务依赖负责人 Mac 开机联网；sandbox 是沙箱演练。正式读写、各平台接入与定时投递仍需分别验收。

## ZIP 备用下载

[下载通用 Skill 安装包](https://github.com/kisaragiiii/jiaowu-agent-skill/raw/refs/heads/main/jiaowu-agent-skill.zip)，解压后将完整 jiaowu-agent 目录交给智能体，说“安装并启用教务Agent”。SHA256SUMS 用于核验安装包。

此仓库仅发布通用客户端源码和安装包。负责人后台、完整人设、业务规则、真实表信息、SOP 和个人凭据均不公开。不要将个人包或 connection.json 上传到 GitHub。

## 设备申请与负责人审批

使用负责人提供的 HTTPS 地址运行 `node scripts/setup.mjs --server https://负责人地址/v1`，将返回的申请编号和公钥指纹通过熟悉的渠道发给负责人。负责人选定对应成员并批准后，运行 `node scripts/setup.mjs --login-status` 完成连接，再运行 `node scripts/agent.mjs me` 核对状态。不反复轮询，不需要钉钉开发者应用。身份由负责人确认，CLI 本人钉钉授权另行完成。

通用 Skill 和申请入口可共用；设备私钥和个人连接不得转发。复制连接文件到另一台机器不能替代设备私钥；完整私钥及凭据一起泄露仍可能被冒用。负责人可即时暂停成员或撤销单台设备，每天北京时间18:00复核后台授权名单，Mac恢复后补查，不自动判断在职状态。

## 更新到自动同步版（2.0.0）

> 请从 https://github.com/kisaragiiii/jiaowu-agent-skill 更新教务Agent，安装完整 jiaowu-agent 目录及 scripts，保留并备份本人现有连接文件和设备私钥，不重新申请设备、不重新配置字段、不输出凭据。重新读取新版 SKILL.md，运行 me 核验自动同步协议；以后每次业务操作自动检查后台最新配置。

客户端每次操作前读取后台版本；普通规则、字段偏好及权限更新无需手动刷新。规则变化时，智能体按返回的新配置重新准备尚未执行的请求，无需再次向教务确认。网络不可达时停止业务，不使用缓存离线写入。未知写入只查原回执，不自动重试。完整人设、SOP及内部规则仍在负责人后台，不下载执行远程代码；需要新客户端能力时提示升级。
