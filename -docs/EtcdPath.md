# ETCD 配置项路径约定

```text
root
+- props                      # 全局设置属性
|  +- {key}                   # 属性名和值
|  \- ...
+- privs                      # 全局设置保密属性
|  +- {key}                   # 属性名和值
|  \- ...
+- {production}               # 产品ID，例：sxdqt
|  +- {version}               # 产品版本号，例：v1.0
|  |  +- {env}                # 环境，例：production, preview, qa等等
|  |  |  +- services          # 每个服务有自己的配置
|  |  |  |  +- gateway        # 服务提供者列表
|  |  |  |  |  +- ends        # 单个服务的提供者和地址
|  |  |  |  |  |  +- {service}# 单个服务的提供者和地址
|  |  |  |  |  |  |  +- {id}  # 服务提供者地址和端口，例：hw02.p2m.org.cn:4001
|  |  |  |  |  |  |  \- ...
|  |  |  |  |  |  \- ...
|  |  |  |  |  +- props       # 属性集合
|  |  |  |  |  |  +- {key}    # 属性名和值
|  |  |  |  |  |  \- ...
|  |  |  |  |  \- privs       # 保密属性集合
|  |  |  |  |     +- {key}    # 属性名和值
|  |  |  |  |     \- ...
|  |  |  |  +- {service}      # 服务名称，例如：merlin
|  |  |  |  |  +- props       # 属性集合
|  |  |  |  |  |  +- {key}    # 属性名和值
|  |  |  |  |  |  \- ...
|  |  |  |  |  \- privs       # 保密属性集合
|  |  |  |  |     +- {key}    # 属性名和值
|  |  |  |  |     \- ...
|  |  |  |  \- ...
|  |  |  +- props             # 共享属性集合
|  |  |  |  +- {key}          # 属性名和值
|  |  |  |  \- ...
|  |  |  \- privs             # 共享保密属性集合
|  |  |     +- {key}          # 属性名和值
|  |  |     \- ...
|  |  \- ...
|  \- ...
\- ...
```

# 约定
* 设置分为"属性"`props`和"保密属性"`privs`两类，"属性"为公开属性，前端可以获得其中
的所有属性。而"保密属性"为保密属性，前端不能够访问。
* 获取属性时，如果属性和保密属性都有值时，且都可以使用时，优先使用保密属性。
* `/${production}/${version}/${env}`是产品管理的基本单元，每份部署都应该隶属于其
中一个单元。该目录下的`props`和`privs`为公共属性，所有的微服务会继承该属性。
* `/${production}/${version}/${env}/services`目录下为每个微服务特有的设置。微服
务访问属性时，如果该属性在专有目录下不存在时，会继承`/${production}/${version}/${env}`
目录下的相同属性。

# 初始化env文件
* 服务目录下的`init`目录中的`*.env`文件为服务初始化配置，用来对当前`/${production}/${version}/${env}`
进行初始化
* 每个文件对应一个服务，文件名应和服务名一致。`base.env`与`_.env`为保留文件。  
其中`base.env`用来初始化通用设置（即：`/${production}/${version}/${env}/props`或
`/${production}/${version}/${env}/privs`）；  
`_.env`用来初始化全局设置（即根目录下的`\props`和`\privs`）
* 文件内容使用env格式。
* 属性名推荐使用大写与'_'组合，可以使用`A-Za-z0-9_-.`字符
* 属性名以'_'开始的，视为保密属性`privs`，否则属于公共属性`props`。
* 如果属性的值中包含`<%= env.PROPNAME %>`的内容时，会从全局设置（即根目录下的`/props`或`/privs`）目录下
查找值，进行替换。如果没有，则被替换为空字符串。
* 替换时，高权限的属性可以使用低权限的属性，反之不可。  
即`/${production}/${version}/${env}/props/FOO=<%= env.BAR %>`中的`<%= env.BAR %>`只
能被替换为`/props/BAR`而不能被替换为`/privs/BAR`。  
而`/${production}/${version}/${env}/privs/FOO=<%= env.BAR %>`可以使用两者，有限使
用`/privs/BAR`。

# 配置文件
pecorino-client被注入到微服务中使用时，会读取微服务根目录下的`pecorino.yaml`与
`pecorino.${NODE_ENV}.yaml`文件，从中读取相关参数设置。并将配置保存到当前服务的环境变量中。
```yaml
service: <本服务的名字，PECORINO_CONFIG_MY_NAME>
master: <Pecorino server的地址，PECORINO_CONFIG_MASTER>
ip: <本服务可以被网关服务访问到的地址, PECORINO_CONFIG_MY_IP>
port: <本服务可以被网关服务访问到的端口, PECORINO_CONFIG_MY_PORT>
watch: <是否监听配置变化并重启本服务，仅适用于pecorino-mon>
register: <是否注册本服务到网关>
require:
  - <需要额外引入的package,例如：babel-register>
```
这些参数会被加载到env中，如下
