class DataFlow {
  container
  graph
  datasources = []
  pipes = []
  elements = {
    edges: [],
    nodes: []
  }
  lastSelectedIdRef = { current: null }

  async getPipeStats() {}

  enrichPipes(pipes, pipeStats) {
    if (!pipes) {
      return []
    }

    return pipes.map(pipe => {
      const stats = pipeStats.find(p => pipe.id === p.id)

      if (!stats) {
        return { ...pipe, requests: 0 }
      }

      return {
        ...pipe,
        requests: stats.requests
      }
    })
  }

  getDependencyGraph(entities) {
    let edgeCount = 0
    let elements = {
      nodes: [],
      edges: []
    }

    if (!Object.keys(entities).length) {
      return elements
    }

    Object.keys(entities['byId']).forEach(function (key) {
      const item = entities['byId'][key]
      const type = item.type

      if (type === 'Pipe') {
        const {
          id,
          name,
          dependencies,
          materializedIds,
          materialized,
          copy_node,
          copy_target_datasource,
          updated_at,
          endpoint,
          requests
        } = item

        if (dependencies.length > 0) {
          dependencies.forEach(dependencyName => {
            if (entities['byName'][dependencyName] !== undefined) {
              const item = {
                id: `e_${edgeCount}`,
                source: entities['byName'][dependencyName]['id'],
                target: id
              }
              elements.edges.push(item)

              edgeCount++
            }
          })
        }

        if (materializedIds?.length > 0) {
          materializedIds.forEach(materializedId => {
            if (entities['byId'][materializedId] !== undefined) {
              elements.edges.push({
                id: `e_${edgeCount}`,
                source: id,
                target: materializedId
              })

              edgeCount++
            }
          })
        }

        if (
          !materializedIds?.length &&
          materialized &&
          !!entities['byId'][materialized]
        ) {
          elements.edges.push({
            id: `e_${edgeCount}`,
            source: id,
            target: materialized
          })

          edgeCount++
        }

        if (copy_target_datasource && !!entities['byId'][copy_target_datasource]) {
          elements.edges.push({
            id: `e_${edgeCount}`,
            source: id,
            target: copy_target_datasource
          })

          edgeCount++
        }

        if (endpoint || copy_target_datasource) {
          elements.nodes.push({
            id: item.id,
            type: 'pipe-node',
            data: {
              name,
              id,
              updated_at,
              endpoint,
              materialized,
              copy_node,
              copy_target_datasource,
              requests
            }
          })
        } else {
          elements.nodes.unshift({
            id: item.id,
            type: 'pipe-node',
            data: {
              name,
              id,
              updated_at,
              endpoint,
              materialized,
              copy_node,
              copy_target_datasource,
              requests
            }
          })
        }
      } else if (type === 'DataSource') {
        const {
          id,
          name,
          used_by,
          engine,
          connector,
          service,
          statistics,
          shared_from,
          shared_with,
          updated_at,
          materialized,
          dataSourceType
        } = item

        elements.nodes.push({
          id,
          type: 'ds-node',
          data: {
            name,
            id,
            statistics,
            connector,
            service,
            engine,
            shared_from,
            shared_with,
            updated_at,
            materialized,
            dataSourceType,
            usedByLength: used_by ? used_by.length : 0
          }
        })
      }
    })

    return elements
  }

  toEntitiesObject(pipes, datasources) {
    let obj = {
      byName: {},
      byId: {}
    }

    if (!pipes || !datasources) {
      return obj
    }

    pipes.forEach(function (pipe) {
      let materialized = null
      let dependencies = []
      const materializedIds = []

      if (pipe.nodes) {
        pipe.nodes.forEach(function (node) {
          if (
            node.dependencies &&
            node.dependencies.length &&
            node.dependencies.length > 0
          ) {
            dependencies = node.dependencies.concat(dependencies)
            dependencies = dependencies.filter(
              (item, pos) => dependencies.indexOf(item) === pos
            )
          }

          if (
            node.materialized &&
            node.materialized !== pipe.id &&
            node.id !== node.materialized
          ) {
            materialized = node.materialized
            materializedIds.push(node.materialized)
          }
        })
      }

      const newItem = {
        ...pipe,
        type: 'Pipe',
        materialized,
        materializedIds,
        dependencies,
        nodes: null
      }

      obj['byId'][pipe.id] = newItem
      obj['byName'][pipe.name] = newItem
    })

    datasources.forEach(function (ds) {
      const newItem = {
        ...ds,
        type: 'DataSource',
        materialized: false,
        used_by: ds.used_by ? ds.used_by.map(n => n.name) : [],
        dataSourceType: ds.type
      }

      obj['byId'][ds.id] = newItem
      obj['byName'][ds.name] = newItem
    })

    return obj
  }

  prepareData(pipes, data) {
    const pipesWithStats = this.enrichPipes(pipes, data || [])
    const entities = this.toEntitiesObject(pipesWithStats, this.datasources)
    return this.getDependencyGraph(entities)
  }

  focusItem(id, fit) {
    const node = this.graph.findById(id)
    if (node && !fit) {
      const {
        _cfg: { bboxCache }
      } = node
      this.graph.focusItem(id)
      this.graph.translate(
        bboxCache ? -bboxCache.width / 2 : -135,
        bboxCache ? -bboxCache.height / 2 : -45
      )
    }
  }

  zoomIn() {
    const ratio = this.graph.getZoom()
    const canvas = this.graph.get('canvas')
    const clientRect = this.container.getBoundingClientRect()
    const point = canvas.getPointByClient(
      clientRect.left + clientRect.width / 2,
      clientRect.top + clientRect.height / 2
    )
    this.graph.zoomTo(ratio + 0.2, point)
  }

  zoomOut() {
    const ratio = this.graph.getZoom()
    const canvas = this.graph.get('canvas')
    const clientRect = this.container.getBoundingClientRect()
    const point = canvas.getPointByClient(
      clientRect.left + clientRect.width / 2,
      clientRect.top + clientRect.height / 2
    )
    this.graph.zoomTo(ratio - 0.2, point)
  }

  registerEdge(G6, type = 'quadratic-horizontal') {
    G6.registerEdge(
      'custom-edge',
      {
        setState(name, value, item) {
          name = name.split(':')[0]
          const group = item.getContainer()
          const shape = group.get('children')[0]

          if (name === 'visible' && value === 'hidden') {
            shape.attr('strokeOpacity', 0.1)
          } else {
            shape.attr('strokeOpacity', 1)
          }
        }
      },
      type
    )
  }

  registerDSNode(G6, maxChars) {
    const grey = '#b3b3b3'
    const ICONS = {
      kafka: () =>
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11.0951 8.75425C10.5261 8.75425 10.0159 8.99579 9.66655 9.37607L8.77137 8.7689C8.8664 8.51824 8.92096 8.24908 8.92096 7.96736C8.92096 7.69053 8.8683 7.42588 8.7764 7.17892L9.66958 6.57819C10.0189 6.95655 10.5277 7.19677 11.0951 7.19677C12.1454 7.19677 13 6.37812 13 5.37172C13 4.36532 12.1454 3.54667 11.0951 3.54667C10.0448 3.54667 9.19019 4.36532 9.19019 5.37172C9.19019 5.55185 9.21859 5.72555 9.26957 5.89006L8.37579 6.49109C8.00243 6.04732 7.46486 5.73748 6.85237 5.6429V4.61087C7.71524 4.43723 8.36539 3.70272 8.36539 2.82505C8.36539 1.81865 7.51077 1 6.46048 1C5.41019 1 4.55557 1.81865 4.55557 2.82505C4.55557 3.69096 5.18888 4.41642 6.03449 4.60245V5.64788C4.88045 5.84196 4 6.8069 4 7.96736C4 9.13348 4.88917 10.102 6.05154 10.2894V11.3933C5.19728 11.5732 4.55557 12.3031 4.55557 13.1749C4.55557 14.1813 5.41019 15 6.46048 15C7.51077 15 8.36539 14.1813 8.36539 13.1749C8.36539 12.3031 7.72368 11.5732 6.86942 11.3933V10.2894C7.45775 10.1945 7.99002 9.89787 8.36707 9.45488L9.26823 10.066C9.21821 10.229 9.19019 10.401 9.19019 10.5793C9.19019 11.5857 10.0448 12.4044 11.0951 12.4044C12.1454 12.4044 13 11.5857 13 10.5793C13 9.57291 12.1454 8.75425 11.0951 8.75425ZM11.0951 4.48685C11.6044 4.48685 12.0186 4.8839 12.0186 5.37172C12.0186 5.85954 11.6044 6.25656 11.0951 6.25656C10.5858 6.25656 10.1715 5.85954 10.1715 5.37172C10.1715 4.8839 10.5858 4.48685 11.0951 4.48685ZM5.53689 2.82505C5.53689 2.33723 5.95117 1.94021 6.46048 1.94021C6.96979 1.94021 7.38404 2.33723 7.38404 2.82505C7.38404 3.31288 6.96979 3.70989 6.46048 3.70989C5.95117 3.70989 5.53689 3.31288 5.53689 2.82505ZM7.38404 13.1749C7.38404 13.6628 6.96979 14.0598 6.46048 14.0598C5.95117 14.0598 5.53689 13.6628 5.53689 13.1749C5.53689 12.6871 5.95117 12.2901 6.46048 12.2901C6.96979 12.2901 7.38404 12.6871 7.38404 13.1749ZM6.46041 9.20142C5.75008 9.20142 5.17221 8.64788 5.17221 7.96736C5.17221 7.28681 5.75008 6.73317 6.46041 6.73317C7.17071 6.73317 7.74857 7.28681 7.74857 7.96736C7.74857 8.64788 7.17071 9.20142 6.46041 9.20142ZM11.0951 11.4642C10.5858 11.4642 10.1715 11.0671 10.1715 10.5793C10.1715 10.0915 10.5858 9.69447 11.0951 9.69447C11.6044 9.69447 12.0186 10.0915 12.0186 10.5793C12.0186 11.0671 11.6044 11.4642 11.0951 11.4642Z' fill='%23FFFFFF'/%3E%3C/svg%3E",
      shared: color =>
        `data:image/svg+xml,%3Csvg width='8' height='11' viewBox='0 0 8 11' fill='none' xmlns='http://www.w3.org/2000/svg' %3E%3Cg opacity='1'%3E%3Cmask id='a' maskUnits='userSpaceOnUse' x='0' y='0' width='8' height='11' fill='%23000'%3E%3Cpath fill='%23FFF' d='M0 0h8v11H0z' /%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M4 5a2 2 0 100-4 2 2 0 000 4zm3 4.81c0 .069-.01.132-.031.19H1.03A.569.569 0 011 9.81C1 8.863 1.5 6 4 6c2 0 3 2.863 3 3.81z' /%3E%3C/mask%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M4 5a2 2 0 100-4 2 2 0 000 4zm3 4.81c0 .069-.01.132-.031.19H1.03A.569.569 0 011 9.81C1 8.863 1.5 6 4 6c2 0 3 2.863 3 3.81z' fill='%23FFF' /%3E%3Cpath d='M6.969 10v1h.708l.235-.667L6.969 10zM1.03 10l-.943.333.235.667h.708v-1zM5 3a1 1 0 01-1 1v2a3 3 0 003-3H5zM4 2a1 1 0 011 1h2a3 3 0 00-3-3v2zM3 3a1 1 0 011-1V0a3 3 0 00-3 3h2zm1 1a1 1 0 01-1-1H1a3 3 0 003 3V4zm3.912 6.333c.06-.172.088-.349.088-.523H6c0-.036.006-.086.026-.143l1.886.666zM1.032 11h5.937V9H1.03v2zM0 9.81c0 .174.027.35.088.523l1.886-.666c.02.057.026.107.026.143H0zM4 5C2.27 5 1.23 6.03.677 7.085.146 8.098 0 9.22 0 9.81h2c0-.357.104-1.14.448-1.796C2.77 7.401 3.23 7 4 7V5zm4 4.81c0-.696-.323-1.825-.892-2.774C6.542 6.092 5.528 5 4 5v2c.471 0 .958.339 1.392 1.064C5.823 8.782 6 9.559 6 9.81h2z' fill='${encodeURIComponent(
          color
        )}' mask='url(%23a)'/%3E%3C/g%3E%3C/svg%3E`,
      materialized: () =>
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9.66142 1.45445C9.12425 1.37396 8.56211 1.33337 7.99996 1.33337C5.33329 1.33337 2.66663 2.24671 2.66663 4.00004V12C2.66663 13.7534 5.33329 14.6667 7.99996 14.6667C10.6666 14.6667 13.3333 13.7534 13.3333 12V9.82035L12 11.5258V12C12 12.4734 10.48 13.3334 7.99996 13.3334C5.51996 13.3334 3.99996 12.4734 3.99996 12V9.82004C5.24801 10.4133 6.61855 10.7034 7.99996 10.6667C8.84398 10.6892 9.68396 10.5896 10.4944 10.3734V8.9958C9.84338 9.19363 8.99967 9.33337 7.99996 9.33337C5.51996 9.33337 3.99996 8.47337 3.99996 8.00004V5.82004C4.64343 6.12594 5.31947 6.35124 6.01277 6.4927C6.00065 6.43234 5.99708 6.37049 6.00239 6.30875C6.01294 6.18614 6.05811 6.06829 6.13335 5.96714L6.69489 5.24888C4.99751 5.02071 3.99996 4.38349 3.99996 4.00004C3.99996 3.52671 5.51996 2.66671 7.99996 2.66671C8.24105 2.66671 8.47307 2.67483 8.6955 2.68994L9.66142 1.45445Z' fill='%23FFFFFF'/%3E%3Cpath d='M15.9453 3.79055C15.9037 3.7083 15.8401 3.63913 15.7615 3.59071C15.6829 3.5423 15.5924 3.51652 15.5 3.51624H12.9979V0.523734C13.0033 0.41435 12.9724 0.306245 12.91 0.216105C12.8476 0.125965 12.7571 0.0588022 12.6526 0.0249834C12.5522 -0.00796251 12.4438 -0.00833274 12.3431 0.0239258C12.2424 0.0561843 12.1546 0.119413 12.0922 0.204534L8.0889 5.69079C8.03874 5.76304 8.00862 5.84722 8.00159 5.9348C7.99456 6.02238 8.01087 6.11026 8.04887 6.18954C8.08386 6.28019 8.14464 6.35868 8.22375 6.41539C8.30287 6.47209 8.39688 6.50454 8.49423 6.50874H10.9963V9.50125C10.9964 9.60642 11.0298 9.70888 11.0918 9.79398C11.1538 9.87908 11.2412 9.94246 11.3416 9.97506C11.3918 9.99059 11.4441 9.99899 11.4967 10C11.5756 10.0002 11.6535 9.98178 11.724 9.94624C11.7944 9.9107 11.8554 9.85905 11.902 9.79551L15.9053 4.30925C15.9592 4.23484 15.9915 4.14704 15.9985 4.05552C16.0056 3.964 15.9872 3.87231 15.9453 3.79055Z' fill='%23FFFFFF'/%3E%3C/svg%3E",
      regular: () =>
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7.99996 1.33337C5.33329 1.33337 2.66663 2.24671 2.66663 4.00004V12C2.66663 13.7534 5.33329 14.6667 7.99996 14.6667C10.6666 14.6667 13.3333 13.7534 13.3333 12V4.00004C13.3333 2.24671 10.6666 1.33337 7.99996 1.33337ZM12 12C12 12.4734 10.48 13.3334 7.99996 13.3334C5.51996 13.3334 3.99996 12.4734 3.99996 12V9.82004C5.24801 10.4133 6.61855 10.7034 7.99996 10.6667C9.38137 10.7034 10.7519 10.4133 12 9.82004V12ZM12 8.00004C12 8.47337 10.48 9.33337 7.99996 9.33337C5.51996 9.33337 3.99996 8.47337 3.99996 8.00004V5.82004C5.24801 6.41335 6.61855 6.70344 7.99996 6.66671C9.38137 6.70344 10.7519 6.41335 12 5.82004V8.00004ZM7.99996 5.33337C5.51996 5.33337 3.99996 4.47337 3.99996 4.00004C3.99996 3.52671 5.51996 2.66671 7.99996 2.66671C10.48 2.66671 12 3.52671 12 4.00004C12 4.47337 10.48 5.33337 7.99996 5.33337Z' fill='%23FFFFFF'/%3E%3C/svg%3E",
      bigquery: () =>
        "data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M7.36939 13.7388C8.87328 13.7388 10.2554 13.2176 11.3451 12.3459L13.4987 14.4996C13.7751 14.776 14.2232 14.776 14.4996 14.4996C14.776 14.2232 14.776 13.7751 14.4996 13.4987L12.3459 11.3451C13.2176 10.2555 13.7388 8.87329 13.7388 7.36939C13.7388 3.85167 10.8871 1 7.36939 1C3.85167 1 1 3.85167 1 7.36939C1 10.8871 3.85167 13.7388 7.36939 13.7388ZM7.36939 12.3234C10.1054 12.3234 12.3234 10.1054 12.3234 7.36939C12.3234 4.63339 10.1054 2.41542 7.36939 2.41542C4.63339 2.41542 2.41542 4.63339 2.41542 7.36939C2.41542 10.1054 4.63339 12.3234 7.36939 12.3234ZM4.39701 7.21865V9.77162C4.7655 10.227 5.23652 10.596 5.77495 10.8435C5.79925 10.772 5.81243 10.6954 5.81243 10.6157V7.21865C5.81243 6.82779 5.49558 6.51094 5.10472 6.51094C4.71386 6.51094 4.39701 6.82779 4.39701 7.21865ZM6.66168 5.23706V11.1256C6.89103 11.1685 7.12759 11.191 7.3694 11.191C7.6112 11.191 7.84776 11.1685 8.0771 11.1256V5.23706C8.0771 4.8462 7.76025 4.52935 7.36939 4.52935C6.97854 4.52935 6.66168 4.8462 6.66168 5.23706ZM8.92636 10.6157C8.92636 10.6954 8.93954 10.772 8.96384 10.8435C9.50227 10.596 9.97329 10.227 10.3418 9.77162V8.35098C10.3418 7.96012 10.0249 7.64327 9.63407 7.64327C9.24321 7.64327 8.92636 7.96012 8.92636 8.35098V10.6157Z' fill='white'/%3E%3C/svg%3E%0A",
      snowflake: () =>
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M9.33336 0.666687C9.70155 0.666687 10 0.965164 10 1.33335V4.04674L12.2822 2.43577C12.583 2.22344 12.999 2.29516 13.2113 2.59596C13.4237 2.89676 13.3519 3.31273 13.0511 3.52506L10.7689 5.13603C9.88572 5.75948 8.66669 5.12783 8.66669 4.04674V1.33335C8.66669 0.965164 8.96517 0.666687 9.33336 0.666687ZM15.1884 5.63759C15.3725 5.95645 15.2633 6.36418 14.9444 6.54828L12.5269 7.94404L14.9722 8.95351C15.3126 9.09401 15.4746 9.48379 15.3341 9.82412C15.1936 10.1645 14.8038 10.3265 14.4635 10.186L12.0181 9.17649C10.9956 8.75438 10.9022 7.34246 11.8602 6.78934L14.2778 5.39358C14.5966 5.20948 15.0043 5.31873 15.1884 5.63759ZM1.05563 6.57741C0.736765 6.39331 0.627515 5.98559 0.81161 5.66673C0.995705 5.34786 1.40343 5.23861 1.72229 5.42271L4.13983 6.81848C5.09786 7.37159 5.00446 8.78351 3.98194 9.20563L1.53658 10.2151C1.19625 10.3556 0.806466 10.1936 0.665973 9.85326C0.525481 9.51293 0.687481 9.12314 1.02781 8.98265L3.47317 7.97318L1.05563 6.57741ZM6.66669 0.666687C6.2985 0.666687 6.00003 0.965164 6.00003 1.33335V4.04674L3.71781 2.43577C3.41701 2.22344 3.00104 2.29516 2.78871 2.59596C2.57638 2.89676 2.6481 3.31273 2.9489 3.52506L5.23111 5.13603C6.11433 5.75948 7.33336 5.12783 7.33336 4.04674V1.33335C7.33336 0.965164 7.03488 0.666687 6.66669 0.666687ZM10 14C10 14.3682 9.70155 14.6667 9.33336 14.6667C8.96517 14.6667 8.66669 14.3682 8.66669 14V11.2866C8.66669 10.2055 9.88572 9.57389 10.7689 10.1973L13.0511 11.8083C13.3519 12.0206 13.4237 12.4366 13.2113 12.7374C12.999 13.0382 12.583 13.1099 12.2822 12.8976L10 11.2866V14ZM6.66669 14.6667C6.2985 14.6667 6.00003 14.3682 6.00003 14V11.2866L3.71781 12.8976C3.41701 13.1099 3.00104 13.0382 2.78871 12.7374C2.57638 12.4366 2.6481 12.0206 2.9489 11.8083L5.23111 10.1973C6.11433 9.57389 7.33336 10.2055 7.33336 11.2866V14C7.33336 14.3682 7.03488 14.6667 6.66669 14.6667ZM7.47143 7.74757L8.00003 7.21897L8.52862 7.74757L8.00003 8.27616L7.47143 7.74757ZM7.52862 5.80476C7.78897 5.54441 8.21108 5.54441 8.47143 5.80476L9.94283 7.27616C10.2032 7.53651 10.2032 7.95862 9.94283 8.21897L8.47143 9.69037C8.21108 9.95072 7.78897 9.95072 7.52862 9.69037L6.05722 8.21897C5.79687 7.95862 5.79687 7.53651 6.05722 7.27616L7.52862 5.80476Z' fill='%23ffffff'/%3E%3C/svg%3E%0A"
    }

    G6.registerNode(
      'ds-node',
      {
        shapeType: 'flow-rect',

        _getIconType(data) {
          if (data.materialized) {
            return 'materialized'
          }
          if (data.dataSourceType === 'bigquery') {
            return 'bigquery'
          }
          if (data.dataSourceType === 'snowflake') {
            return 'snowflake'
          }
          return 'regular'
        },

        _getIconAttrs(x, y, data) {
          if (data.materialized) {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['materialized']()
            }
          }
          if (data.dataSourceType === 'bigquery') {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['bigquery']()
            }
          }
          if (data.dataSourceType === 'snowflake') {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['snowflake']()
            }
          }
          if (data?.service === 'kafka' || data?.dataSourceType === 'kafka') {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['kafka']()
            }
          }

          return {
            x: x + 4,
            y: y + 4,
            width: 16,
            height: 16,
            img: ICONS['regular']()
          }
        },

        _getName({ name }) {
          return name.length > maxChars ? name.substr(0, maxChars) + '...' : name
        },

        _getDesc({ statistics, updated_at }) {
          const statsLabel = statistics ? `${statistics.row_count} rows` : '-'

          return `${statsLabel} / Updated ${new Date(updated_at).toDateString()}`
        },

        _getExtraDesc(data) {
          const numberOfWorkspacesSharedWith = 0
          const originalDSData = { original_workspace_name: '' }
          const isSharedByUs = false
          const isSharedByOthers = false
          return isSharedByUs
            ? `Shared with ${numberOfWorkspacesSharedWith} workspaces`
            : isSharedByOthers
            ? `Shared from ${originalDSData.original_workspace_name}`
            : `Not currently in use`
        },

        _genExtraWrapper(group, x, y, data, mainColor) {
          const extraWrapper = group.addShape('rect', {
            attrs: {
              x: x,
              y: y - 32,
              width: 272,
              height: 32,
              radius: [0, 0, 4, 4],
              fill: mainColor,
              opacity: 0.04,
              cursor: 'pointer'
            }
          })

          group.addShape('text', {
            attrs: {
              textAlign: 'left',
              textBaseline: 'bottom',
              x: extraWrapper.getBBox().x + 16,
              y: extraWrapper.getBBox().y + 22,
              text: this._getExtraDesc(data),
              fontSize: 12,
              fontWeight: 'normal',
              fontFamily: 'Inter',
              lineHeight: 16,
              fill: mainColor,
              cursor: 'pointer'
            }
          })
        },

        draw(cfg, group) {
          const { data } = cfg
          const { name, updated_at, statistics, usedByLength, selected } = data
          const isSharedByUs = false
          const isSharedByOthers = false
          const mainColor =
            isSharedByUs || isSharedByOthers || usedByLength > 0
              ? '#C157DB'
              : '#F76363'

          const rectConfig = {
            width: 272,
            height: !usedByLength || isSharedByUs || isSharedByOthers ? 94 : 64,
            lineWidth: selected ? 2 : 1,
            fill: '#FFF',
            radius: 4,
            stroke: selected ? mainColor : grey,
            opacity: 1,
            cursor: 'pointer'
          }

          const nodeOrigin = {
            x: 0,
            y: 0
          }

          const textConfig = {
            textAlign: 'left',
            textBaseline: 'bottom'
          }

          const rect = group.addShape('rect', {
            attrs: {
              x: nodeOrigin.x,
              y: nodeOrigin.y,
              ...rectConfig,
              name: 'main'
            }
          })

          // Name
          const nameShape = group.addShape('text', {
            attrs: {
              ...textConfig,
              x: 16 + nodeOrigin.x,
              y: 28 + nodeOrigin.y,
              text: this._getName({ name }),
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'Inter,system-ui,sans-serif',
              lineHeight: 16,
              opacity: 1,
              fill: '#25283D',
              cursor: 'pointer'
            },
            name: 'ds-name'
          })

          // Name underline
          group.addShape('rect', {
            attrs: {
              x: 16 + nodeOrigin.x,
              y: 28 + nodeOrigin.y,
              width: nameShape.getBBox().width,
              height: 0.3,
              stroke: '#25283D',
              opacity: 0
            },
            name: 'name-underline'
          })

          // Desc
          group.addShape('text', {
            attrs: {
              ...textConfig,
              x: nodeOrigin.x + 16,
              y: nodeOrigin.y + 48,
              text: this._getDesc({ statistics, updated_at }),
              fontSize: 10,
              fontWeight: 'normal',
              fontFamily: 'ia_writer_duo_sregular,monospace',
              lineHeight: 12,
              fill: '#676B7B',
              cursor: 'pointer'
            }
          })

          // Icon wrapper
          const iconWrapper = group.addShape('rect', {
            attrs: {
              x: nodeOrigin.x - 16,
              y: nodeOrigin.y + 8,
              width: 24,
              height: 24,
              radius: 4,
              fill: mainColor,
              cursor: 'pointer'
            },
            name: 'image-shape-wrapper'
          })

          // Icon element
          const iconElement = group.addShape('image', {
            attrs: this._getIconAttrs(
              iconWrapper.getBBox().x,
              iconWrapper.getBBox().y,
              data
            ),
            name: 'image-shape'
          })

          iconElement.type = this._getIconType(data)

          // Extra message
          if (!usedByLength || isSharedByOthers || isSharedByUs) {
            this._genExtraWrapper(
              group,
              nodeOrigin.x,
              rect.getBBox().maxY,
              data,
              mainColor
            )
          }

          // Sharing sub Icon
          if (isSharedByOthers) {
            group.addShape('image', {
              attrs: {
                x: iconWrapper.getBBox().x + 13,
                y: iconWrapper.getBBox().y + 4,
                width: 8 / 1.1,
                height: 11 / 1.1,
                img: ICONS['shared'](mainColor)
              },
              name: 'image-shape-sub'
            })
          }

          return rect
        },
        update(cfg, node) {
          const { data } = cfg
          const { usedByLength } = data

          const group = node.getContainer()
          const rectElement = group.get('children')[0]
          const textElement = group.get('children')[1]
          const textUnderline = group.get('children')[2]
          const descElement = group.get('children')[3]
          const iconWrapper = group.get('children')[4]
          const iconElement = group.get('children')[5]
          const extraElement = group.get('children')[6]
          const extraDescElement = group.get('children')[7]

          const isSharedByUs = false
          const isSharedByOthers = false
          const mainColor =
            isSharedByUs || isSharedByOthers || usedByLength > 0
              ? '#C157DB'
              : '#F76363'

          // Check component height
          const newHeight =
            !usedByLength || isSharedByUs || isSharedByOthers ? 94 : 64
          if (rectElement.attrs.height !== newHeight) {
            rectElement.attr('height', newHeight)
          }

          // Name + underline
          const newName = this._getName(data)
          if (textElement.attrs.text !== newName) {
            textElement.attr('text', newName)
            textUnderline.attr('width', textElement.getBBox().width)
          }

          // Desc
          const newDesc = this._getDesc(data)
          if (descElement.attrs.text !== newDesc) {
            descElement.attr('text', newDesc)
          }

          // Icon background
          if (iconWrapper.attrs.fill !== mainColor) {
            iconWrapper.attr('fill', mainColor)
          }

          // Icon element
          const iconType = this._getIconType(data)
          if (iconType !== iconElement.type) {
            const iconAttrs = this._getIconAttrs(
              iconWrapper.getBBox().x,
              iconWrapper.getBBox().y,
              data
            )
            iconElement.type = iconAttrs.type
            iconElement.attr(iconAttrs)
          }

          // Add/remove/change extra message
          if (!usedByLength || isSharedByOthers || isSharedByUs) {
            if (!extraElement) {
              this._genExtraWrapper(
                group,
                0,
                rectElement.getBBox().maxY,
                data,
                mainColor
              )
            } else {
              // Extra fill
              if (extraElement.attrs.fill !== mainColor) {
                extraElement.attr('fill', mainColor)
              }

              // Extra desc
              const newDesc = this._getExtraDesc(data)
              if (newDesc !== extraDescElement.attrs.text) {
                extraDescElement.attr('text', newDesc)
                extraDescElement.attr('fill', mainColor)
              }
            }
          } else if (extraElement) {
            group.removeChild(extraElement)
            group.removeChild(extraDescElement)
          }

          // Add/remove/change sub icon
          // No need to manage if the icon has to change, because if the Data Source stops being shared with the user,
          // the Data Source node will disappear from the graph
        },
        setState(name, value, item) {
          name = name.split(':')[0]
          const group = item.getContainer()
          const rect = group.get('children')[0]
          const iconWrapper = group.get('children')[4]
          const extraWrapper = group.get('children')[6]
          const extraWrapperDesc = group.get('children')[7]
          const subIcon = group.get('children')[8]
          const {
            _cfg: {
              model: { data }
            }
          } = item
          const { usedByLength } = data
          const isSharedByUs = false
          const isSharedByOthers = false
          const mainColor =
            isSharedByUs || isSharedByOthers || usedByLength > 0
              ? '#C157DB'
              : '#F76363'

          if (name === 'visible' && value === 'visible') {
            if (isSharedByOthers) {
              subIcon.attr('img', ICONS['shared']())
            }

            group.attr('opacity', 1)
          } else if (name === 'visible' && value === 'hidden') {
            rect.attr('stroke', grey)
            iconWrapper.attr('fill', mainColor)

            if (extraWrapper) {
              extraWrapper.attr('fill', mainColor)
              extraWrapperDesc.attr('fill', mainColor)
            }

            if (isSharedByOthers) {
              subIcon.attr('img', ICONS['kafka']())
            }

            group.attr('opacity', 0.1)
          } else {
            rect.attr('stroke', grey)
            iconWrapper.attr('fill', mainColor)

            if (extraWrapper) {
              extraWrapper.attr('fill', mainColor)
              extraWrapperDesc.attr('fill', mainColor)
            }

            if (isSharedByOthers) {
              subIcon.attr('img', ICONS['kafka']())
            }

            group.attr('opacity', 1)
          }
        },
        getAnchorPoints() {
          return [
            [-0.06, 0.25],
            [1, 0.5]
          ]
        }
      },
      'rect'
    )
  }

  registerPipeNode(G6, maxChars) {
    const grey = '#b3b3b3'

    const ICONS = {
      materialized:
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.26 6.36667C13.2046 6.25673 13.1199 6.16427 13.0151 6.09955C12.9104 6.03483 12.7898 6.00038 12.6667 6H9.33336V2C9.34052 1.85379 9.29935 1.70929 9.21621 1.5888C9.13308 1.46832 9.0126 1.37854 8.87336 1.33334C8.73951 1.2893 8.59515 1.2888 8.461 1.33192C8.32686 1.37504 8.20982 1.45956 8.1267 1.57334L2.79336 8.90667C2.72654 9.00325 2.68642 9.11576 2.67705 9.23283C2.66768 9.3499 2.68941 9.46736 2.74003 9.57334C2.78664 9.6945 2.86762 9.79942 2.97302 9.87522C3.07842 9.95101 3.20366 9.99438 3.33336 10H6.6667V14C6.6668 14.1406 6.71134 14.2775 6.79396 14.3913C6.87658 14.505 6.99304 14.5898 7.1267 14.6333C7.19368 14.6541 7.26325 14.6653 7.33336 14.6667C7.43855 14.6669 7.54232 14.6423 7.63617 14.5948C7.73002 14.5473 7.8113 14.4783 7.87336 14.3933L13.2067 7.06C13.2785 6.96053 13.3215 6.84317 13.3309 6.72084C13.3403 6.59851 13.3158 6.47595 13.26 6.36667ZM8.00003 11.9467V9.33334C8.00003 9.15653 7.92979 8.98696 7.80477 8.86193C7.67974 8.73691 7.51017 8.66667 7.33336 8.66667H4.6667L8.00003 4.05334V6.66667C8.00003 6.84348 8.07027 7.01305 8.19529 7.13807C8.32032 7.2631 8.48989 7.33334 8.6667 7.33334H11.3334L8.00003 11.9467Z' fill='%23FFFFFF'/%3E%3C/svg%3E",
      endpoint:
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6.66669 3.33333C6.53483 3.33333 6.40594 3.37243 6.29631 3.44569C6.18667 3.51894 6.10123 3.62306 6.05077 3.74488C6.00031 3.8667 5.98711 4.00074 6.01283 4.13006C6.03855 4.25938 6.10205 4.37817 6.19528 4.47141C6.28852 4.56464 6.40731 4.62813 6.53663 4.65386C6.66595 4.67958 6.79999 4.66638 6.92181 4.61592C7.04363 4.56546 7.14775 4.48001 7.221 4.37038C7.29425 4.26075 7.33335 4.13186 7.33335 4C7.33335 3.82319 7.26312 3.65362 7.13809 3.5286C7.01307 3.40357 6.8435 3.33333 6.66669 3.33333ZM4.00002 3.33333C3.86817 3.33333 3.73927 3.37243 3.62964 3.44569C3.52001 3.51894 3.43456 3.62306 3.3841 3.74488C3.33364 3.8667 3.32044 4.00074 3.34616 4.13006C3.37189 4.25938 3.43538 4.37817 3.52862 4.47141C3.62185 4.56464 3.74064 4.62813 3.86996 4.65386C3.99928 4.67958 4.13333 4.66638 4.25514 4.61592C4.37696 4.56546 4.48108 4.48001 4.55433 4.37038C4.62759 4.26075 4.66669 4.13186 4.66669 4C4.66669 3.82319 4.59645 3.65362 4.47142 3.5286C4.3464 3.40357 4.17683 3.33333 4.00002 3.33333ZM9.33335 3.33333C9.2015 3.33333 9.07261 3.37243 8.96297 3.44569C8.85334 3.51894 8.76789 3.62306 8.71743 3.74488C8.66698 3.8667 8.65377 4.00074 8.6795 4.13006C8.70522 4.25938 8.76871 4.37817 8.86195 4.47141C8.95518 4.56464 9.07397 4.62813 9.20329 4.65386C9.33261 4.67958 9.46666 4.66638 9.58848 4.61592C9.71029 4.56546 9.81441 4.48001 9.88767 4.37038C9.96092 4.26075 10 4.13186 10 4C10 3.82319 9.92978 3.65362 9.80476 3.5286C9.67973 3.40357 9.51017 3.33333 9.33335 3.33333ZM13.3334 0.666668H2.66669C2.13625 0.666668 1.62755 0.877382 1.25247 1.25245C0.877401 1.62753 0.666687 2.13623 0.666687 2.66667V13.3333C0.666687 13.8638 0.877401 14.3725 1.25247 14.7475C1.62755 15.1226 2.13625 15.3333 2.66669 15.3333H13.3334C13.8638 15.3333 14.3725 15.1226 14.7476 14.7475C15.1226 14.3725 15.3334 13.8638 15.3334 13.3333V2.66667C15.3334 2.13623 15.1226 1.62753 14.7476 1.25245C14.3725 0.877382 13.8638 0.666668 13.3334 0.666668ZM14 13.3333C14 13.5101 13.9298 13.6797 13.8048 13.8047C13.6797 13.9298 13.5102 14 13.3334 14H2.66669C2.48988 14 2.32031 13.9298 2.19528 13.8047C2.07026 13.6797 2.00002 13.5101 2.00002 13.3333V7.33333H14V13.3333ZM14 6H2.00002V2.66667C2.00002 2.48986 2.07026 2.32029 2.19528 2.19526C2.32031 2.07024 2.48988 2 2.66669 2H13.3334C13.5102 2 13.6797 2.07024 13.8048 2.19526C13.9298 2.32029 14 2.48986 14 2.66667V6Z' fill='%23FFFFFF'/%3E%3C/svg%3E",
      copy: "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' %3E%3Cpath d='M7.33203 10V11.4533C7.05243 11.5529 6.79849 11.7134 6.58863 11.9233C6.37877 12.1331 6.21824 12.3871 6.1187 12.6667H1.9987C1.82189 12.6667 1.65232 12.7369 1.52729 12.8619C1.40227 12.987 1.33203 13.1565 1.33203 13.3333C1.33203 13.5101 1.40227 13.6797 1.52729 13.8047C1.65232 13.9298 1.82189 14 1.9987 14H6.1187C6.25883 14.3861 6.51445 14.7197 6.85081 14.9554C7.18717 15.1912 7.58795 15.3177 7.9987 15.3177C8.40944 15.3177 8.81023 15.1912 9.14659 14.9554C9.48295 14.7197 9.73856 14.3861 9.8787 14H13.9987C14.1755 14 14.3451 13.9298 14.4701 13.8047C14.5951 13.6797 14.6654 13.5101 14.6654 13.3333C14.6654 13.1565 14.5951 12.987 14.4701 12.8619C14.3451 12.7369 14.1755 12.6667 13.9987 12.6667H9.8787C9.77915 12.3871 9.61863 12.1331 9.40876 11.9233C9.1989 11.7134 8.94496 11.5529 8.66536 11.4533V10H7.33203ZM7.9987 14C7.86684 14 7.73795 13.9609 7.62832 13.8876C7.51868 13.8144 7.43324 13.7103 7.38278 13.5885C7.33232 13.4666 7.31912 13.3326 7.34484 13.2033C7.37056 13.074 7.43406 12.9552 7.52729 12.8619C7.62053 12.7687 7.73932 12.7052 7.86864 12.6795C7.99796 12.6538 8.132 12.667 8.25382 12.7174C8.37564 12.7679 8.47976 12.8533 8.55301 12.963C8.62626 13.0726 8.66536 13.2015 8.66536 13.3333C8.66536 13.5101 8.59513 13.6797 8.4701 13.8047C8.34508 13.9298 8.17551 14 7.9987 14Z' fill='%23FFFFFF' /%3E%3Cpath d='M14.6667 3.96C14.6597 3.89876 14.6463 3.83842 14.6267 3.78V3.72C14.5946 3.65145 14.5519 3.58844 14.5 3.53333L11.1667 0.2C11.1116 0.148144 11.0485 0.105387 10.98 0.0733333C10.9601 0.0705067 10.9399 0.0705067 10.92 0.0733333C10.8523 0.0344942 10.7775 0.0095628 10.7 0H8.66667C8.13623 0 7.62753 0.210714 7.25245 0.585787C6.87738 0.960859 6.66667 1.46957 6.66667 2V2.66667H6C5.46957 2.66667 4.96086 2.87738 4.58579 3.25245C4.21071 3.62753 4 4.13623 4 4.66667V8C4 8.53043 4.21071 9.03914 4.58579 9.41421C4.96086 9.78929 5.46957 10 6 10H10C10.5304 10 11.0391 9.78929 11.4142 9.41421C11.7893 9.03914 12 8.53043 12 8V7.33333H12.6667C13.1971 7.33333 13.7058 7.12262 14.0809 6.74755C14.456 6.37247 14.6667 5.86377 14.6667 5.33333V4C14.6667 4 14.6667 4 14.6667 3.96ZM11.3333 2.27333L12.3933 3.33333H12C11.8232 3.33333 11.6536 3.2631 11.5286 3.13807C11.4036 3.01305 11.3333 2.84348 11.3333 2.66667V2.27333ZM10.6667 8C10.6667 8.17681 10.5964 8.34638 10.4714 8.47141C10.3464 8.59643 10.1768 8.66667 10 8.66667H6C5.82319 8.66667 5.65362 8.59643 5.5286 8.47141C5.40357 8.34638 5.33333 8.17681 5.33333 8V4.66667C5.33333 4.48986 5.40357 4.32029 5.5286 4.19526C5.65362 4.07024 5.82319 4 6 4H6.66667V5.33333C6.66667 5.86377 6.87738 6.37247 7.25245 6.74755C7.62753 7.12262 8.13623 7.33333 8.66667 7.33333H10.6667V8ZM13.3333 5.33333C13.3333 5.51014 13.2631 5.67971 13.1381 5.80474C13.013 5.92976 12.8435 6 12.6667 6H8.66667C8.48986 6 8.32029 5.92976 8.19526 5.80474C8.07024 5.67971 8 5.51014 8 5.33333V2C8 1.82319 8.07024 1.65362 8.19526 1.5286C8.32029 1.40357 8.48986 1.33333 8.66667 1.33333H10V2.66667C10 3.1971 10.2107 3.70581 10.5858 4.08088C10.9609 4.45595 11.4696 4.66667 12 4.66667H13.3333V5.33333Z' fill='%23FFFFFF' /%3E%3C/svg%3E",
      default:
        "data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 12.6667H9.87998C9.78043 12.3871 9.61991 12.1331 9.41005 11.9233C9.20018 11.7134 8.94624 11.5529 8.66665 11.4533V10H10.6666C11.1971 10 11.7058 9.78929 12.0809 9.41422C12.4559 9.03915 12.6666 8.53044 12.6666 8.00001V5.33334C12.6666 5.33334 12.6666 5.33334 12.6666 5.29334C12.6597 5.2321 12.6463 5.17176 12.6266 5.11334V5.05334C12.5946 4.98479 12.5518 4.92178 12.5 4.86667V4.86667L8.49998 0.866672C8.44487 0.814816 8.38186 0.772059 8.31331 0.740005C8.29341 0.737179 8.27321 0.737179 8.25331 0.740005C8.18559 0.701166 8.11079 0.676235 8.03331 0.666672H5.33331C4.80288 0.666672 4.29417 0.877385 3.9191 1.25246C3.54403 1.62753 3.33331 2.13624 3.33331 2.66667V8.00001C3.33331 8.53044 3.54403 9.03915 3.9191 9.41422C4.29417 9.78929 4.80288 10 5.33331 10H7.33331V11.4533C7.05371 11.5529 6.79978 11.7134 6.58991 11.9233C6.38005 12.1331 6.21953 12.3871 6.11998 12.6667H1.99998C1.82317 12.6667 1.6536 12.7369 1.52858 12.8619C1.40355 12.987 1.33331 13.1565 1.33331 13.3333C1.33331 13.5101 1.40355 13.6797 1.52858 13.8047C1.6536 13.9298 1.82317 14 1.99998 14H6.11998C6.26012 14.3861 6.51573 14.7197 6.85209 14.9554C7.18845 15.1912 7.58923 15.3177 7.99998 15.3177C8.41073 15.3177 8.81151 15.1912 9.14787 14.9554C9.48423 14.7197 9.73984 14.3861 9.87998 14H14C14.1768 14 14.3464 13.9298 14.4714 13.8047C14.5964 13.6797 14.6666 13.5101 14.6666 13.3333C14.6666 13.1565 14.5964 12.987 14.4714 12.8619C14.3464 12.7369 14.1768 12.6667 14 12.6667ZM8.66665 2.94001L10.3933 4.66667H9.33331C9.1565 4.66667 8.98693 4.59643 8.86191 4.47141C8.73688 4.34639 8.66665 4.17682 8.66665 4.00001V2.94001ZM5.33331 8.66667C5.1565 8.66667 4.98693 8.59643 4.86191 8.47141C4.73688 8.34639 4.66665 8.17682 4.66665 8.00001V2.66667C4.66665 2.48986 4.73688 2.32029 4.86191 2.19527C4.98693 2.07024 5.1565 2.00001 5.33331 2.00001H7.33331V4.00001C7.33331 4.53044 7.54403 5.03915 7.9191 5.41422C8.29417 5.78929 8.80288 6.00001 9.33331 6.00001H11.3333V8.00001C11.3333 8.17682 11.2631 8.34639 11.1381 8.47141C11.013 8.59643 10.8435 8.66667 10.6666 8.66667H5.33331ZM7.99998 14C7.86813 14 7.73923 13.9609 7.6296 13.8877C7.51997 13.8144 7.43452 13.7103 7.38406 13.5885C7.3336 13.4666 7.3204 13.3326 7.34612 13.2033C7.37185 13.074 7.43534 12.9552 7.52857 12.8619C7.62181 12.7687 7.7406 12.7052 7.86992 12.6795C7.99924 12.6538 8.13328 12.667 8.2551 12.7174C8.37692 12.7679 8.48104 12.8533 8.55429 12.963C8.62755 13.0726 8.66665 13.2015 8.66665 13.3333C8.66665 13.5101 8.59641 13.6797 8.47138 13.8047C8.34636 13.9298 8.17679 14 7.99998 14Z' fill='%23FFFFFF'/%3E%3C/svg%3E"
    }

    G6.registerNode(
      'pipe-node',
      {
        shapeType: 'flow-rect',
        _getIconType({ materialized, endpoint, copy_node }) {
          if (materialized) {
            return 'materialized'
          }
          if (endpoint) {
            return 'endpoint'
          }
          if (copy_node) {
            return 'copy'
          }

          return 'default'
        },
        _getIconAttrs(x, y, { materialized, endpoint, copy_node }) {
          if (materialized) {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['materialized']
            }
          }

          if (endpoint) {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['endpoint']
            }
          }

          if (copy_node) {
            return {
              x: x + 4,
              y: y + 4,
              width: 16,
              height: 16,
              img: ICONS['copy']
            }
          }

          return {
            x: x + 4,
            y: y + 4,
            width: 16,
            height: 16,
            img: ICONS['default']
          }
        },
        _getName({ name }) {
          return name.length > maxChars ? name.substr(0, maxChars) + '...' : name
        },
        _getDesc({ materialized, requests, endpoint, copy_node }) {
          if (materialized) {
            return 'Materializing data'
          }

          if (endpoint) {
            return `${requests} requests in the last 7 days`
          }

          if (copy_node) {
            return 'Copying data'
          }

          return 'No API endpoint published'
        },
        draw(cfg, group) {
          const {
            data: { endpoint, name, materialized, requests, selected, copy_node }
          } = cfg

          const mainColor = endpoint ? '#1FCC83' : '#F2901C'

          const rectConfig = {
            width: 272,
            height: 64,
            lineWidth: selected ? 2 : 1,
            fontSize: 12,
            fill: '#FFF',
            radius: 4,
            stroke: selected ? mainColor : grey,
            opacity: 1,
            cursor: 'pointer'
          }

          const nodeOrigin = {
            x: 0,
            y: 0
          }

          const textConfig = {
            textAlign: 'left',
            textBaseline: 'bottom'
          }

          const rect = group.addShape('rect', {
            attrs: {
              x: nodeOrigin.x,
              y: nodeOrigin.y,
              ...rectConfig
            }
          })

          // name
          const nameShape = group.addShape('text', {
            attrs: {
              ...textConfig,
              x: 16 + nodeOrigin.x,
              y: 28 + nodeOrigin.y,
              text: this._getName({ name }),
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'Inter',
              lineHeight: 16,
              opacity: 1,
              fill: '#25283D',
              cursor: 'pointer'
            },
            name: 'pipe-name'
          })

          // Name underline
          group.addShape('rect', {
            attrs: {
              x: 16 + nodeOrigin.x,
              y: 28 + nodeOrigin.y,
              width: nameShape.getBBox().width,
              height: 0.3,
              stroke: '#25283D',
              opacity: 0
            },
            name: 'name-underline'
          })

          // Desc
          group.addShape('text', {
            attrs: {
              ...textConfig,
              x: nodeOrigin.x + 16,
              y: nodeOrigin.y + 48,
              text: this._getDesc({ materialized, endpoint, requests, copy_node }),
              fontSize: 10,
              fontWeight: 'normal',
              fontFamily: 'ia_writer_duo_sregular,monospace',
              lineHeight: 12,
              fill: '#676B7B',
              cursor: 'pointer'
            }
          })

          // Icon wrapper
          const iconWrapper = group.addShape('rect', {
            attrs: {
              x: nodeOrigin.x - 16,
              y: nodeOrigin.y + 8,
              width: 24,
              height: 24,
              radius: 4,
              fill: endpoint ? '#1FCC83' : '#F2901C',
              cursor: 'pointer'
            }
          })

          const iconEl = group.addShape('image', {
            attrs: this._getIconAttrs(
              iconWrapper.getBBox().x,
              iconWrapper.getBBox().y,
              {
                materialized,
                endpoint,
                copy_node
              }
            )
          })

          iconEl.type = this._getIconType({ materialized, endpoint, copy_node })

          return rect
        },
        update(cfg, node) {
          const {
            data: { endpoint, name, materialized, requests, copy_node }
          } = cfg

          const group = node.getContainer()
          const textElement = group.get('children')[1]
          const textUnderline = group.get('children')[2]
          const descElement = group.get('children')[3]
          const iconWrapper = group.get('children')[4]
          const iconElement = group.get('children')[5]

          // Name
          const newName = this._getName({ name })
          if (textElement.attrs.text !== newName) {
            textElement.attr('text', newName)
            textUnderline.attr('width', textElement.getBBox().width)
          }

          // Requests desc
          const newDesc = this._getDesc({
            materialized,
            endpoint,
            requests,
            copy_node
          })
          if (descElement.attrs.text !== newDesc) {
            descElement.attr('text', newDesc)
          }

          // Icon background
          const newIconBackground = endpoint ? '#1FCC83' : '#F2901C'
          if (iconWrapper.attrs.fill !== newIconBackground) {
            iconWrapper.attr('fill', newIconBackground)
          }

          // Icon image
          const iconType = this._getIconType({ materialized, endpoint, copy_node })
          if (iconType !== iconElement.type) {
            const iconAttrs = this._getIconAttrs(
              iconWrapper.getBBox().x,
              iconWrapper.getBBox().y,
              { materialized, endpoint, copy_node }
            )
            iconElement.type = iconAttrs.type
            iconElement.attr(iconAttrs)
          }
        },
        setState(name, value, item) {
          name = name.split(':')[0]
          const group = item.getContainer()
          const rect = group.get('children')[0]
          const iconWrapper = group.get('children')[4]
          const {
            _cfg: {
              model: {
                data: { endpoint }
              }
            }
          } = item

          if (name === 'visible' && value === 'visible') {
            rect.attr('strokeOpacity', 1)
            group.attr('opacity', 1)
          } else if (name === 'visible' && value === 'hidden') {
            rect.attr('stroke', grey)
            group.attr('opacity', 0.1)
            iconWrapper.attr('fill', endpoint ? '#1FCC83' : '#F2901C')
          } else {
            rect.attr('stroke', grey)
            group.attr('opacity', 1)
            iconWrapper.attr('fill', endpoint ? '#1FCC83' : '#F2901C')
          }
        },
        getAnchorPoints() {
          return [
            [-0.06, 0.25],
            [1, 0.5]
          ]
        }
      },
      'rect'
    )
  }

  createGraph(fit) {
    if (!this.graph && this.container) {
      const NAME_MAX_CHARS = 32
      this.registerPipeNode(window.G6, NAME_MAX_CHARS)
      this.registerDSNode(window.G6, NAME_MAX_CHARS)
      this.registerEdge(
        window.G6,
        this.elements && this.elements.nodes.length > 50
          ? 'quadratic'
          : 'cubic-horizontal'
      )

      window.G6.registerBehavior('double-finger-drag-canvas', {
        getEvents: function getEvents() {
          return {
            wheel: 'onWheel'
          }
        },
        onWheel: function onWheel(ev) {
          if (ev.ctrlKey) {
            const canvas = _graph.get('canvas')
            const point = canvas.getPointByClient(ev.clientX, ev.clientY)
            let ratio = _graph.getZoom()
            if (ev.wheelDelta > 0) {
              ratio = ratio + ratio * 0.05
            } else {
              ratio = ratio - ratio * 0.05
            }
            _graph.zoomTo(ratio, {
              x: point.x,
              y: point.y
            })
          } else {
            let x = ev.deltaX || ev.movementX
            let y = ev.deltaY || ev.movementY
            const axis = ev.axis

            if (axis && navigator.userAgent.indexOf('Firefox') > -1) {
              if (ev.axis === 2) {
                y = (-ev.wheelDelta * 125) / 3
                x = 0
              } else if (ev.axis === 1) {
                y = 0
                x = (-ev.wheelDelta * 125) / 3
              }
            }

            _graph.translate(-x, -y)
          }
          ev.preventDefault()
        }
      })

      const clientRect = this.container.getBoundingClientRect()
      const _graph = new window.G6.Graph({
        maxZoom: 1,
        minZoom: 0.2,
        container: this.container,
        width: clientRect.width,
        height: clientRect.height,
        modes: {
          default: [
            {
              type: 'double-finger-drag-canvas'
            },
            {
              type: 'drag-canvas'
            }
          ]
        },
        fitView: fit,
        fitViewPadding: 16,
        layout: {
          type: 'dagre',
          rankdir: 'LR',
          align: 'UL',
          nodesepFunc: function ({ type, data }) {
            if (type === 'ds-node') {
              if (
                !data.usedByLength /* ||
                isDataSourceSharedByOthers({ datasource: data }) ||
                isDataSourceBeingSharedByUs({ datasource: data }) */
              ) {
                return 30
              }
            }

            return 0
          },
          ranksep: '270'
        },
        defaultNode: {
          type: 'node'
        },
        defaultEdge: {
          type: 'custom-edge',
          style: {
            stroke: '#b3b3b3',
            endArrow: {
              path: 'M 0,0 L 5,5 M 0,0 L 5,-5' // Customize the path for the arrow
            }
          }
        },
        plugins: []
      })
      return _graph
    }
  }

  calculateCoordsDiff(node, startCoords) {
    if (!node) {
      return { x: 0, y: 0 }
    }

    const endBBox = node.getBBox()
    const endCoords = this.graph.getCanvasByPoint(endBBox.x, endBBox.y)

    const diff = {
      x: endCoords.x - startCoords.x,
      y: endCoords.y - startCoords.y
    }

    return diff
  }

  translateCanvas(nodeId, startCoords) {
    window.requestAnimationFrame(() => {
      const node = this.graph.findById(nodeId)
      if (node) {
        const coordsDiff = this.calculateCoordsDiff(node, startCoords)
        this.graph.translate(-coordsDiff.x, -coordsDiff.y)
      }
    })
  }

  onCanvasClickCallback(nodeId, startCoords) {
    this.lastSelectedIdRef.current = null
    this.translateCanvas(nodeId, startCoords)
  }

  onNodeClickCallback(nodeId, startCoords) {
    this.lastSelectedIdRef.current = nodeId
    this.translateCanvas(nodeId, startCoords)
  }

  getLastSelectedId() {
    return this.lastSelectedIdRef.current
  }

  renderNodes() {
    this.graph.changeData(this.elements)
  }

  renderGraph() {
    this.graph.on('afterrender', function () {
      /* if (selectedId) {
        callback(selectedId)
      } else {
        graph.translate(80, 80)
      } */
    })

    this.graph.render()

    this.renderNodes()
  }

  onChangeDimensions({ width, height }) {
    if (this.graph) {
      this.graph.changeSize(width, height)
    }
  }

  render(datasources, pipes) {
    this.datasources = datasources
    this.pipes = pipes
    this.container = document.getElementById('graph-container')
    if (!this.container) return
    this.elements = this.prepareData(pipes, [])
    this.graph = this.createGraph(true)
    this.renderGraph()
  }
}

;(function () {
  const vscode = acquireVsCodeApi()
  const dataFlow = new DataFlow()

  window.addEventListener('message', async event => {
    const message = event.data
    switch (message.command) {
      case 'loadEntities': {
        try {
          const { datasources, pipes } = message.data
          dataFlow.render(datasources, pipes)
        } catch (error) {}

        return
      }
    }
  })

  vscode.postMessage({
    command: 'dataFlowLoaded'
  })
})()
