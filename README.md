# Nestjs 和 Prisma 实现 Restful Api

## 第一章

### 技术：Nestjs、Prisma、PostgresSQL、Swagger、TypeScript

### 前提条件

* Node 18 +
* Docker + PostgresSQL
* Prisma 插件，安装在 VSCode 或者 WebStorm
* Linux 或 macOS shell 终端

(windows 机器的终端命令可能有所不同，需要自行修改)

### 创建 Nestjs 项目

```shell
npx @nestjs/cli new median
```

建议使用 pnpm 安装管理依赖

安装依赖

```shell
pnpm install
```

运行

```shell
pnpm start:dev
```

访问 http://localhost:3000/ 可以看到 'Hello World!'

### 创建 PostgresSQL 数据库

在项目根目录创建 touch docker-compose.yml 文件

```shell
touch docker-compose.yml
```

配置 docker-compose 内容，参考配置如下

```yaml
services:
  db:
    image: postgres
    restart: always
    environment:
      - POSTGRES_DB=mydb
      - POSTGRES_USER=myuser
      - POSTGRES_PASSWORD=mypassword
    volumes:
      - postgres:/var/lib/postgresql/data
    ports:
      - '5432:5432'
  adminer:
    image: adminer
    restart: always
    ports:
      - 8080:8080
volumes:
  postgres:
```

启动你的 Docker Desktop, 在项目根目录终端运行以下命令

```shell
docker-compose up -d
```

-d 选项，保证在你关闭终端之后，容器在后台持续运行

### 安装 Prisma

```shell
pnpm install -D prisma
```

初始化 prisma，请在终端运行以下命令

```shell
npx prisma init
```

之后在你的项目根目录，会创建一个 prisma 目录，里面包含一个 schema.prisma 文件，此外还会生成一个 .env 文件

修改 .env 文件，配置 PostgresSQL 连接

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydb?schema=public"
```

### 理解 prisma schema

打开 prisma/schema.prisma 文件，内容如下

```shell
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

这个文件是用Prisma模式语言编写的，Prisma使用这种语言来定义数据库模式。Prisma文件有三个主要部分：

* Data source(数据源)：指定您的数据库连接。上面的配置意味着您的数据库提供程序是PostgresSQL，数据库连接字符串在DATABASE_URL环境变量中可用
* Generator(生成器)：指示您想要为数据库生成一个类型安全的查询生成器Prisma Client。它用于向数据库发送查询。
* Data model(数据模型)：定义数据库模型。每个模型将被映射到底层数据库中的一个表。现在您的模式中还没有模型，您将在下一节中探索这一部分

### 数据模型

在 prisma/schema.prisma 文件中添加以下内容

```
model Article {
  id          Int      @id @default(autoincrement())
  title       String   @unique
  description String?
  body        String
  published   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("article")
}
```

模型定义了一个名为 Article 的表，包含以下字段： 
* id: 主键，自动递增的整型。
* title: 唯一的字符串字段，用于存储文章标题。
* description: 可选的字符串字段，用于存储文章描述。
* body: 字符串字段，存储文章的主体内容。
* published: 布尔值，默认值为 false，指示文章是否已发布。
* createdAt: 日期时间字段，默认值为当前时间，指示创建时间。
* updatedAt: 日期时间字段，自动更新为当前时间，指示最后更新时间。

数据库映射:

* @@map("article") 用于将 Prisma 模型映射到数据库中的 article 表。这在数据库中表名与模型名不同时非常有用。

tips:每次更改模型后，确保重新生成 Prisma 客户端，以便更新你的客户端代码：
```shell
npx prisma generate
```

### 迁移数据库

定义了Prisma模式后，您将运行迁移以在数据库中创建实际的表。要生成并执行第一次迁移，请在终端运行以下命令：

```shell
npx prisma migrate dev --name "init"
```

命令做了下面三件事：

* 保存迁移：Prisma Migrate将获取模式的快照，并找出执行迁移所需的SQL命令。Prisma将把包含SQL命令的迁移文件保存到新创建的Prisma
  /migrations文件夹中。
* 执行迁移：Prisma Migrate将执行迁移文件中的SQL，以在数据库中创建基础表。
* 生成Prisma客户端：Prisma将根据您的最新架构生成Prisma客户端。由于没有安装Client库，因此CLI也将为您安装它。您应该在包的依赖项中看到@prisma/client包。json文件。Prisma Client是一个从你的Prisma模式自动生成的TypeScript查询生成器。它是为您的Prisma模式量身定制的，将用于向数据库发送查询。

在 prisma/migrations 目录下面可以找到 migration.sql 文件
```sql
-- CreateTable
CREATE TABLE "article" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_title_key" ON "article"("title");
```

### 为数据库插入数据

首先，我们需要创建一个脚本文件 **seed.ts** ，在数据库里添加一些数据

```shell
touch prisma/seed.ts
```

创建文件之后，在里面写入下面这些代码
```ts
import { PrismaClient } from '@prisma/client';

// 初始化 Prisma Client
const prisma = new PrismaClient();

async function main() {
  // 创建2篇虚拟文章
  const post1 = await prisma.article.create({
    data: {
      title: 'Prisma Adds Support for MongoDB',
      body: 'Support for MongoDB has been one of the most requested features since the initial release of...',
      description:
        "We are excited to share that today's Prisma ORM release adds stable support for MongoDB!",
      published: false,
    },
  });

  // upsert：用于创建或更新，确保在满足 where 条件时更新，否则创建新记录。
  const post2 = await prisma.article.upsert({
    where: {
      title: "What's new in Prisma ? (Q1 / 22)",
    },
    update: {},
    create: {
      title: "What's new in Prisma? (Q1/22)",
      body: 'Our engineers have been working hard, issuing new releases with many improvements...',
      description:
        'Learn about everything in the Prisma ecosystem and community from January to March 2022.',
      published: true,
    },
  });
  console.log(post1, post2);
}

// 执行 main 函数
main()
  .catch((e) => {
    console.log(e);
    // 非正常退出进程，不会执行后续任何代码
    process.exit(1);
  })
  .finally(async () => {
    // 关闭 Prisma Client
    await prisma.$disconnect();
  });
```

在项目根目录 package.json 里新增一个脚本命令
```json
{
  "scripts": {
    // ...
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

然后手动执行以下命令执行种子脚本：
```shell
npx prisma db seed
```

在运行 prisma db push 或 prisma migrate dev 等命令时，可以自动执行种子脚本。

### 查看数据库

还记得前面我们配置 docker-compose.yml 文件吗？里面的 Adminer 现在可以派上用场了。

访问 **http://localhost:8080/** 选择 PostgresSQL 数据库，输入 docker-compose.yml 中配置的数据库名称、用户名以及密码，就可以查看数据库了。现在我们可以看见里面新增了2篇文章。

### 创建一个 Nestjs Prisma Service

使用 Nestjs 内置的指令，快速创建一个 prisma 模块和服务，具体请参考 Nestjs 官网
```shell
nest g mo prisma
nest g s prisma
```

创建服务的时候可以也可以加上命令 --no-spec, 这样就不会生成对应的测试文件了。
```shell
nest g s prisma --no-spec
```

现在，在根目录下 /src/prisma 里会有2个文件：
* prisma.module.ts
* prisma.service.ts

```ts
// src/prisma/prisma.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient{}
```

```ts
// src/prisma/prisma.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 安装 Swagger

```shell
pnpm install --save @nestjs/swagger swagger-ui-express
```

现在打开 main.ts 使用SwaggerModule类初始化Swagger

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Median')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}

bootstrap();
```

重新运行应用，访问 http://localhost:3000/api 就能看到 Swagger 接口文档了。

### 实现文章的 CRUD

使用以下命令用于快速生成一个包含基本 CRUD 功能的资源模块。它会自动创建服务、控制器、DTOs（数据传输对象）等文件，帮助你快速搭建一个 RESTful API 或 GraphQL API
 ```shell
nest g resource
```

您将得到一些CLI提示。请回答以下问题：
1. What name would you like to use for this resource (plural, e.g., "users")? articles
2. What transport layer do you use? REST API
3. Would you like to generate CRUD entry points? Yes

现在你可以看到 src/articles 里面自动帮我们生成了一系列代码。

### 将 PrismaClient 添加到 Articles 模块

```ts
// src/articles/articles.module.ts
import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  controllers: [ArticlesController],
  providers: [ArticlesService],
  imports: [PrismaModule],
})
export class ArticlesModule {}
```

现在可以在ArticlesService中注入PrismaService，并使用它来访问数据库。要做到这一点，像这样添加一个构造函数到articles.service.ts：

```ts
// src/articles/articles.service.ts

import { Injectable } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  // CRUD operations
}
```

### 实现 GET /articles 接口

使用 @Get() 设置接口为 get 请求

```ts
// src/articles/articles.controller.ts

@Get()
findAll() {
  return this.articlesService.findAll();
}
```

实现查询所有文章的逻辑

```ts
// src/articles/articles.service.ts

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  create(createArticleDto: CreateArticleDto) {
    return 'This action adds a new article';
  }

  findAll() {
    // return `This action returns all articles`;
    return this.prisma.article.findMany({ where: { published: true } });
  }
```

启动项目，访问 http://localhost:3000/articles 你可以看到成功的返回了一篇文章

### 实现 GET /articles/drafts 接口

Nestjs 不会帮我们自动生成查询所有未发布的文章的接口，我们需要自己动手实现它，非常的简单

新增接口
```ts
// src/articles/articles.controller.ts
@Get('drafts')
findDrafts() {
  return this.articlesService.findDrafts();
}
```

实现查询逻辑
```ts
// src/articles/articles.service.ts
findDrafts() {
  return this.prisma.article.findMany({
    where: {
      published: false,
    },
  });
}
```

访问 http://localhost:3000/articles/drafts 可以看到返回了一条未发布的文章

### 实现 GET /articles/:id 查询文章详情的接口

接口代码 Nestjs 已经为我们生成了，路由接受一个动态id参数，该参数传递给findOne控制器路由处理程序。由于Article模型有一个整数id字段，因此需要使用+运算符将id参数强制转换为一个数字。

路由参数获取到数据类型是 string，现在我们还没有学习 Nestjs 的管道操作，它可以帮助我们完成数据的校验和类型转换，暂时我们先这样模拟处理
```ts
// src/articles/articles.controller.ts

@Get(':id')
findOne(@Param('id') id: string) {
  return this.articlesService.findOne(+id);
}
```

接下来我们来实现一下查询逻辑
```ts
findOne(id: number) {
    return this.prisma.article.findUnique({
      where: { id },
    });
  }
```

访问 http://localhost:3000/articles/1 可以看到查询到了一篇文章

### 实现 POST /articles 接口

新增接口 Nestjs 已经自动实现了
```ts
// src/articles/articles.controller.ts

@Post()
create(@Body() createArticleDto: CreateArticleDto) {
  return this.articlesService.create(createArticleDto);
}
```

CreateArticleDto 是请求参数的类型，接下来我们完善字段的定义
```ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ required: false, default: false })
  published: boolean = false;
}
```

通过使用 @ApiProperty 装饰器（来自 @nestjs/swagger），可以为 DTO 类中的属性提供描述信息。这些描述信息会被用于生成 Swagger 文档

实现新增文章的具体逻辑
```ts
// src/articles/articles.service.ts
create(createArticleDto: CreateArticleDto) {
  return this.prisma.article.create({
    data: createArticleDto,
  });
}
```

### 实现 PATCH /articles/:id 更新文章的接口

Nestjs 已经为我们生成了接口代码
```ts
// src/articles/articles.controller.ts

@Patch(':id')
update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
  return this.articlesService.update(+id, updateArticleDto);
}
```

查看 UpdateArticleDto 类

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
```

PartialType 用于生成一个新的类，其中所有的属性都继承自 CreateArticleDto，但都变成了可选字段，这样就不必手动设置每个属性的 ?

实现一下更新文章的逻辑
```ts
// src/articles/articles.service.ts
update(id: number, updateArticleDto: UpdateArticleDto) {
  console.log(updateArticleDto);
  return this.prisma.article.update({
    where: { id },
    data: updateArticleDto,
  });
}
```

更新的时候必须传入 id 作为条件，如果数据库里找不到这条数据就会报错，我们暂时不用关注这个问题，在后续我们会学习如何处理错误。

### 实现 DELETE /articles/:id 删除文章接口

Nestjs 已经为我们生成了接口
```ts
// src/articles/articles.controller.ts

@Delete(':id')
remove(@Param('id') id: string) {
  return this.articlesService.remove(+id);
}
```

实现一下删除的代码逻辑
```ts
// src/articles/articles.service.ts
remove(id: number) {
  return this.prisma.article.delete({
    where: { id },
  });
}
```

### 将 Swagger 接口分支归类

在 NestJS 中，@ApiTags() 装饰器来自 @nestjs/swagger 包，用于为控制器的所有路由生成分组标签。这个标签会出现在 Swagger 文档的分组中，便于 API 使用者快速定位和查找相关的路由和接口。
```ts
// src/articles/articles.controller.ts

import { ApiTags } from '@nestjs/swagger';

@Controller('articles')
@ApiTags('articles')
export class ArticlesController {
  // ...
}
```

### 更新Swagger响应类型

现在我们的 Swagger 接口文档还没有 Responses 响应类型的描述，因为 Swagger 不知道响应类型，我们需要用装饰器完善

首先，需要定义一个实体，Swagger可以使用它来标识返回的实体对象的形状。要做到这一点，在articles.entity.ts文件中更新ArticleEntity类如下：
```ts
// src/articles/entities/article.entity.ts

import { Article } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ArticleEntity implements Article {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  description: string | null;

  @ApiProperty()
  body: string;

  @ApiProperty()
  published: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
```

这是一个由Prisma客户端生成的Article类型的实现，每个属性都添加了@ApiProperty装饰器。现在，是时候用正确的响应类型注释控制器路由处理程序了。为此，NestJS有一组装饰器。”

```ts
// src/articles/articles.controller.ts

import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ArticleEntity } from './entities/article.entity';

@Controller('articles')
@ApiTags('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @ApiCreatedResponse({ type: ArticleEntity })
  create(@Body() createArticleDto: CreateArticleDto) {
    return this.articlesService.create(createArticleDto);
  }

  @Get()
  @ApiOkResponse({ type: ArticleEntity, isArray: true })
  findAll() {
    return this.articlesService.findAll();
  }

  @Get('drafts')
  @ApiOkResponse({ type: ArticleEntity, isArray: true })
  findDrafts() {
    return this.articlesService.findDrafts();
  }

  @Get(':id')
  @ApiOkResponse({ type: ArticleEntity })
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ArticleEntity })
  update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return this.articlesService.update(+id, updateArticleDto);
  }

  @Delete(':id')
  @ApiOkResponse({ type: ArticleEntity })
  remove(@Param('id') id: string) {
    return this.articlesService.remove(+id);
  }
}
```

相关装饰器的解释：
* @ApiCreatedResponse({ type: ArticleEntity })：用于 POST /articles 路由，表示成功创建文章后返回 ArticleEntity 类型的数据，状态码为 201 Created。
* @ApiOkResponse({ type: ArticleEntity })：用于 GET、PATCH 和 DELETE 路由，表示请求成功时返回 ArticleEntity 类型的数据，状态码为 200 OK。
* isArray: true：用于 findAll() 和 findDrafts() 方法，表明返回的是 ArticleEntity 数组。

总结：我们实现了 Nestjs 搭配 prisma 操作数据库 CRUD 的 restful 接口，并且提供了 Swagger 接口文档。

## 第二章

### 参数验证与转换

为了执行输入验证，您将使用NestJS Pipes。管道对路由处理程序正在处理的参数进行操作。Nest在路由处理程序之前调用一个管道，该管道接收用于路由处理程序的参数。管道可以做很多事情，比如验证输入、向输入添加字段等等。管道类似于中间件，但管道的作用域仅限于处理输入参数。NestJS提供了一些开箱即用的管道，但是您也可以创建自己的管道

管道有两个典型的用例：
* 验证：评估输入的数据，如果有效，则不加修改地传递；否则，当数据不正确时抛出异常。
* 转换：将输入数据转换为所需的形式（例如，从字符串转换为整数）。

### 全局设置ValidationPipe

在 NestJS 中，可以使用内置的 ValidationPipe 来进行输入验证。ValidationPipe 提供了一种便捷的方法，能够强制对所有来自客户端的请求数据进行验证。验证规则通过 class-validator 包的装饰器来声明，装饰器用于定义 DTO 类中的验证规则，以确保传入的数据符合预期的格式和类型。
首先我们需要安装2个库

```shell
pnpm install class-validator class-transformer
```

在 **main.ts** 引入 **ValidationPipe**，然后使用 **app.useGlobalPipes**

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Median')
    .setDescription('The Median API description')
    .setVersion('0.1')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

### 向CreateArticleDto添加验证规则

使用 **class-validator** 库给 **CreateArticleDto** 添加验证装饰器。

打开 **src/articles/dto/create-article.dto.ts** 文件，替换成以下内容：
```ts
// src/articles/dto/create-article.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @ApiProperty()
  title: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(300)
  @ApiProperty({ required: false })
  description?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  body: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({ required: false, default: false })
  published?: boolean = false;
}
```
