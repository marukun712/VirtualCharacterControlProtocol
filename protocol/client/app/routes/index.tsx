import { createRoute } from 'honox/factory'
import VCCPClient from '../islands/vccp-client'

export default createRoute((c) => {
  return c.render(
    <div class="w-full h-screen">
      <title>VCCP Client</title>
      <VCCPClient />
    </div>
  )
})
